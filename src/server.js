import path from 'node:path';
import { statSync } from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';

import * as content from './content.js';
import * as auth from './auth.js';
import { createResizer, prepareUpload, wantsResize } from './images.js';
import { PAGE_SIZE, cardData, formatDate, renderEntry, renderHome, renderList, renderNotFound, renderTag, renderTags } from './render.js';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const production = process.env.NODE_ENV === 'production';
const origin = (process.env.SITE_ORIGIN ?? `http://localhost:${port}`).replace(/\/$/, '');
// Set while the site is on a temporary address, so search engines ignore it.
const noindex = process.env.NOINDEX === 'true';

const mtime = (file) => Math.round(statSync(path.join(publicDir, file)).mtimeMs).toString(36);
const site = { origin, noindex, assetVersion: mtime('css/site.css') + mtime('js/site.js') };

const loaded = await content.init();
await auth.init();
console.log(`Loaded ${loaded} articles and pages from ${content.contentDir}`);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind nginx on the VPS

// The join page embeds a HubSpot form and articles embed YouTube videos.
const HUBSPOT = ['https://*.hsforms.net', 'https://*.hsforms.com', 'https://*.hubspot.com', 'https://*.hubapi.com', 'https://*.hscollectedforms.net', 'https://*.hs-scripts.com', 'https://*.hs-analytics.net', 'https://*.hs-banner.com', 'https://*.hubspotusercontent-eu1.net'];
const RECAPTCHA = ['https://www.google.com', 'https://www.gstatic.com'];
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'", ...HUBSPOT, ...RECAPTCHA],
        styleSrc: ["'self'", "'unsafe-inline'", ...HUBSPOT],
        fontSrc: ["'self'", 'data:', ...HUBSPOT],
        frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://docs.google.com', ...HUBSPOT, ...RECAPTCHA],
        connectSrc: ["'self'", ...HUBSPOT],
        formAction: ["'self'", ...HUBSPOT],
        objectSrc: ["'none'"],
        // The editor shows its live preview in a frame on the same site.
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
    strictTransportSecurity: production,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'sameorigin' },
  }),
);
app.use(compression());
if (noindex) {
  app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
}

const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

// ---------- Static files and images ----------
const week = 1000 * 60 * 60 * 24 * 7;
const sendResized = createResizer(path.join(content.dataDir, 'cache'));

// Legacy uploads from the WordPress era live in public/assets.
app.get('/assets/*file', async (req, res, next) => {
  if (!wantsResize(req)) return next();
  const file = path.join(publicDir, decodeURIComponent(req.path));
  if (!file.startsWith(path.join(publicDir, 'assets') + path.sep)) return next();
  try {
    return await sendResized(req, res, { file, mtimeMs: statSync(file).mtimeMs });
  } catch {
    return next();
  }
});

// Images and documents that sit beside an article or page.
app.get('/media/*file', async (req, res, next) => {
  const source = await content.mediaFile(decodeURIComponent(req.path.slice('/media/'.length)));
  if (!source) return next();
  if (!wantsResize(req)) return res.sendFile(source.file, { maxAge: week });
  try {
    return await sendResized(req, res, source);
  } catch (error) {
    console.error(`Could not resize ${req.path}: ${error.message}`);
    return res.sendFile(source.file);
  }
});

// The editor script is always revalidated, so a deploy that changes the save
// protocol reaches browsers that already have the editor open.
app.use('/js/edit.js', (req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});
app.use(express.static(publicDir, { maxAge: production ? week : 0, index: false }));

// ---------- Editor ----------
const editPage = path.join(root, 'views/edit.html');
const loginLimiter = rateLimit({ windowMs: 1000 * 60 * 15, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });
const json = express.json({ limit: '2mb' });

app.get('/api/auth/google', loginLimiter, noStore, auth.startGoogleSignIn);
app.get(auth.CALLBACK_PATH, loginLimiter, noStore, auth.finishGoogleSignIn);

app.use('/edit', noStore);

const api = express.Router();
app.use('/edit/api', api);

// REST resources, all JSON:
//   /session                      GET who is signed in, DELETE to sign out
//   /articles, /pages             GET the list, POST a new one
//   /articles/:slug, /pages/:slug GET, PUT (with If-Match), DELETE
//   /articles/:slug/images        GET the list, POST an upload
//   /articles/:slug/preview       POST unsaved text, get the rendered page back
//   /tags                         GET every tag in use
//   /people, /people/:email       GET, POST, DELETE (owners only)
// A page inside a folder has a slash in its slug, sent as %2F.
api.get('/session', (req, res) => {
  const editor = auth.currentEditor(req);
  res.json({ editor, signInReady: auth.googleConfigured() || Boolean(!production && process.env.DEV_LOGIN_EMAIL), backup: editor ? content.gitStatus() : null });
});

api.delete('/session', (req, res) => {
  auth.endSession(res);
  res.status(204).end();
});

const publicUrl = (entry) => `/${entry.slug}`;
const etag = (entry) => `"${entry.revision}"`;

const summary = (entry) => ({
  kind: entry.kind,
  slug: entry.slug,
  title: entry.title,
  date: entry.date ? entry.date.toISOString().slice(0, 10) : '',
  dateLabel: entry.date ? formatDate(entry.date) : '',
  draft: entry.draft,
  tags: entry.tags,
  notes: entry.todo.length,
});

const detail = (entry) => ({
  ...summary(entry),
  url: publicUrl(entry),
  body: entry.body.trim(),
  todo: entry.todo,
  coverImage: entry.coverSource,
  coverUrl: entry.cover ? `${entry.cover}?w=500` : '',
  coverImageAlignment: entry.coverAlignName,
});

const sendEntry = (res, entry, status = 200) => res.status(status).set('ETag', etag(entry)).json(detail(entry));

api.get('/tags', auth.requireEditor, (req, res) => res.json(content.listTags().map((tag) => tag.tag)));

for (const [collection, kind] of [['articles', 'article'], ['pages', 'page']]) {
  const item = `/${collection}/:slug`;
  const find = (req, res, next) => {
    req.entry = content.getEntry(kind, req.params.slug.toLowerCase());
    return req.entry ? next() : res.status(404).json({ error: 'That no longer exists.' });
  };

  api.get(`/${collection}`, auth.requireEditor, (req, res) => {
    const list = kind === 'article' ? content.searchArticles(req.query.q, { drafts: true }) : content.listEntries('page', { drafts: true });
    res.json(list.map(summary));
  });

  api.post(`/${collection}`, auth.requireEditor, json, async (req, res) => {
    const entry = await content.createEntry(kind, { slug: req.body?.slug, title: req.body?.title }, req.editor.name);
    res.location(`/edit/api/${collection}/${encodeURIComponent(entry.slug)}`);
    sendEntry(res, entry, 201);
  });

  api.get(item, auth.requireEditor, find, (req, res) => sendEntry(res, req.entry));

  api.put(item, auth.requireEditor, find, json, async (req, res) => {
    const match = req.get('If-Match');
    if (!match) return res.status(428).json({ error: 'This save did not say which version it was based on. Please reload the page.' });
    const entry = await content.saveEntry(kind, req.entry.slug, { ...req.body, revision: match.replaceAll('"', '') }, req.editor.name);
    return sendEntry(res, entry);
  });

  api.delete(item, auth.requireEditor, find, async (req, res) => {
    await content.deleteEntry(kind, req.entry.slug, req.editor.name);
    res.status(204).end();
  });

  api.get(`${item}/images`, auth.requireEditor, find, async (req, res) => res.json(await content.listImages(kind, req.entry.slug)));

  api.post(`${item}/images`, auth.requireEditor, find, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(422).json({ error: 'Please choose an image.' });
    const prepared = await prepareUpload(req.file.buffer).catch(() => null);
    if (!prepared) return res.status(415).json({ error: 'That file is not an image this site can use. Try a JPEG or PNG.' });
    const image = await content.addImage(kind, req.entry.slug, { originalName: req.file.originalname, ...prepared }, req.editor.name);
    return res.status(201).location(image.url).json(image);
  });

  // The preview is an ordinary form post into a frame: the reply is the full
  // page, drawn by the same templates as the live site.
  api.post(`${item}/preview`, auth.requireEditor, find, express.urlencoded({ extended: false, limit: '2mb' }), async (req, res) => {
    const form = req.body ?? {};
    const fields = {
      title: form.title || 'Untitled',
      date: form.date || '',
      tags: String(form.tags ?? '').split('\n'),
      todo: String(form.todo ?? '').split('\n'),
      coverImage: form.coverImage ?? '',
      coverImageAlignment: form.coverImageAlignment || 'middle',
      draft: false,
    };
    const entry = await content.previewEntry(kind, req.entry.slug, { fields, body: form.body ?? '' });
    res.type('html').send(renderEntry({ site: { ...site, noindex: true }, entry }));
  });
}

api.get('/people', auth.requireOwner, (req, res) => res.json(auth.listPeople()));

api.post('/people', auth.requireOwner, json, async (req, res) => {
  const result = await auth.addEditor(req.body?.email, req.editor.email);
  if (result.error) return res.status(422).json(result);
  return res.status(201).json(auth.listPeople());
});

api.delete('/people/:email', auth.requireOwner, async (req, res) => {
  await auth.removeEditor(req.params.email);
  res.status(204).end();
});

api.use((req, res) => res.status(404).json({ error: 'Not found.' }));

api.use((error, req, res, _next) => {
  if (error instanceof content.ContentError) return res.status(error.status).json({ error: error.message });
  if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'That image is too large. The limit is 20MB.' });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong on the server. Your text is still on this screen; please try again.' });
});

app.get(['/edit', '/edit/*pane'], (req, res) => res.sendFile(editPage));

// ---------- Public pages ----------
const editLinkFor = (req, entry) => {
  if (!auth.currentEditor(req)) return null;
  return entry ? `/edit/${entry.kind}/${entry.slug}` : '/edit';
};

const send = (res, body, status = 200) => res.status(status).set('Cache-Control', 'no-cache').type('html').send(body);

app.get('/', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const page = Number.parseInt(req.query.page, 10) || 1;
  send(res, renderHome({ site, articles: content.searchArticles(query), query, page, editLink: editLinkFor(req) }));
});

app.get('/api/articles', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const found = content.searchArticles(query);
  res.set('Cache-Control', 'no-cache').json({
    total: found.length,
    pages: Math.max(1, Math.ceil(found.length / PAGE_SIZE)),
    page,
    items: found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(cardData),
  });
});

app.get('/tags', (req, res) => send(res, renderTags({ site, tags: content.listTags() })));

app.get('/tags/:tag', (req, res, next) => {
  const tag = content.listTags().find((item) => item.slug === req.params.tag.toLowerCase());
  if (!tag) return next();
  return send(res, renderTag({ site, tag, articles: content.articlesWithTag(tag.slug) }));
});

app.get('/todos', (req, res) => {
  const articles = content.listEntries('article').filter((article) => article.todo.length > 0);
  send(res, renderList({ site, title: 'Articles that need work', intro: 'We always have articles with todos, why not take a look and see if you can contribute.', path: '/todos', articles, withTodo: true }));
});

app.get('/cleanup', (req, res) => {
  const articles = content.listEntries('article').filter((article) => !article.ok);
  send(res, renderList({ site, title: 'Articles to check', intro: 'These articles have minor improvements or cleanups needed.', path: '/cleanup', articles }));
});

app.get('/robots.txt', (req, res) => {
  res.type('text').send(noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /edit\nSitemap: ${origin}/sitemap.xml\n`);
});

app.get('/sitemap-index.xml', (req, res) => res.redirect(301, '/sitemap.xml'));

app.get('/sitemap.xml', (req, res) => {
  const paths = ['/', '/tags', ...content.listTags().map((tag) => `/tags/${tag.slug}`), ...content.listEntries('page').filter((page) => page.slug !== '404').map(publicUrl), ...content.listEntries('article').map(publicUrl)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>\n`);
});

// Share images the old site generated at /api/og/<slug>.png are still in
// other sites' caches; send them to the image that replaced them.
app.get('/api/og/:name', (req, res) => {
  const entry = content.getEntry('article', req.params.name.replace(/\.png$/, '').toLowerCase());
  res.redirect(302, entry?.cover ? `${entry.cover}?og=1` : '/img/og-default.jpg');
});

const findRedirect = (wanted) => [...content.listEntries('article'), ...content.listEntries('page')].find((entry) => entry.redirectFrom.some((from) => from.replace(/^\/|\/$/g, '').toLowerCase() === wanted));

app.get('/*path', (req, res, next) => {
  const tidy = req.path.toLowerCase().replace(/\/index\.html?$/, '/').replace(/(.)\/+$/, '$1');
  const slug = decodeURIComponent(tidy.slice(1));
  const entry = content.getEntry('page', slug) ?? content.getEntry('article', slug);

  if (!entry || slug === '404') {
    const moved = findRedirect(slug);
    return moved ? res.redirect(301, publicUrl(moved)) : next();
  }
  // One URL per page: /Report, /report/ and /report/index.html all go to /report.
  if (tidy !== req.path) return res.redirect(301, tidy + req.url.slice(req.path.length));

  const editor = auth.currentEditor(req);
  if (entry.draft && !editor) return next();
  const notice = entry.draft ? 'This is a draft. Only signed-in editors can see it.' : null;
  return send(res, renderEntry({ site, entry, editLink: editLinkFor(req, entry), notice }));
});

app.use((req, res) => {
  send(res, renderNotFound({ site, entry: content.getEntry('page', '404') }), 404);
});

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).type('text').send('Something went wrong. Please try again in a moment.');
});

// Pick up changes pushed to the content repository from elsewhere.
const SYNC_MS = 1000 * 60 * 5;
if (content.gitStatus().mode === 'push') {
  setInterval(() => content.syncFromRemote().catch((error) => console.error(error)), SYNC_MS).unref();
}

app.listen(port, host, () => console.log(`PCF website listening on http://${host}:${port}`));
