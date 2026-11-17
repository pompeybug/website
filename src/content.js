// Content store. Articles and pages are Markdown files with YAML front matter
// in CONTENT_DIR (a checkout of the content repository). Everything is read
// into memory at start; a save rewrites one file and re-reads just that entry.

import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import YAML from 'yaml';
import slugify from '@sindresorhus/slugify';
import { renderMarkdown, resolveUrl, summarise } from './markdown.js';
import { createGit } from './git.js';

const root = path.resolve(import.meta.dirname, '..');
export const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
export const contentDir = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(dataDir, 'content');

const KINDS = { article: 'articles', page: 'pages' };
const SOURCE = /\.mdx?$/;
const IMAGE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
const ALIGNMENTS = { top: true, middle: true, bottom: true };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const git = createGit(contentDir);
export const gitStatus = () => git.status();

let entries = new Map();
let version = 0;
export const getVersion = () => version;

const key = (kind, slug) => `${kind}:${slug}`;
const stamp = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const toArray = (value) => (value === null || value === undefined || value === '' ? [] : [value].flat().map(String));
const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const tagSlug = (tag) => slugify(tag);
export const toTitleCase = (text) =>
  text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// ---------- Reading ----------
function splitSource(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text);
  return match ? { frontMatter: match[1], body: text.slice(match[0].length) } : { frontMatter: '', body: text };
}

function parseEntry(kind, slug, file, text, changed = null) {
  const { frontMatter, body } = splitSource(text);
  const raw = YAML.parse(frontMatter) ?? {};
  const mediaBase = `/media/${path.relative(contentDir, path.dirname(file)).split(path.sep).join('/')}`;
  const rendered = renderMarkdown(body, { mediaBase, mdx: file.endsWith('.mdx') });
  const cover = raw.coverImage ? resolveUrl(raw.coverImage, mediaBase) : null;
  return {
    kind,
    slug,
    file,
    // Only an entry that has its own folder can hold uploaded images.
    hasFolder: /^index\.mdx?$/.test(path.basename(file)),
    mediaBase,
    revision: stamp(text),
    body,
    ...rendered,
    // A summary written by an editor wins over the opening words of the text.
    description: raw.description ? summarise(String(raw.description), 300) : rendered.description,
    summary: raw.description ? String(raw.description) : '',
    title: String(raw.title ?? slug),
    date: toDate(raw.date),
    modified: [toDate(raw.date), changed].filter(Boolean).sort((a, b) => b - a)[0] ?? null,
    wpId: raw.id ? String(raw.id) : null,
    tags: toArray(raw.tags),
    todo: toArray(raw.todo),
    author: raw.author ? String(raw.author) : null,
    draft: raw.draft === true,
    cover,
    coverSource: raw.coverImage ? String(raw.coverImage) : '',
    coverAlignName: raw.coverImageAlignment in ALIGNMENTS ? raw.coverImageAlignment : 'middle',
    floatImages: raw.floatImages === true,
    hubspotForm: raw.hubspotForm ?? null,
    ok: raw.ok === true || raw.ok === 'true',
    redirectFrom: toArray(raw.redirect_from),
    // For pages that should stay out of search results, such as a thank-you page.
    noindex: raw.noindex === true,
  };
}

async function walk(dir, prefix = '') {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) found.push(...(await walk(path.join(dir, item.name), relative)));
    else if (SOURCE.test(item.name)) found.push(relative);
  }
  return found;
}

// articles/foo.md and articles/foo/index.md are both the entry "foo".
const slugFor = (relative) =>
  relative
    .replace(SOURCE, '')
    .replace(/(^|\/)index$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

// Articles that share a title ("Open Meeting") need the date to tell them apart.
function markSharedTitles(map) {
  const counts = new Map();
  for (const entry of map.values()) counts.set(entry.title.toLowerCase(), (counts.get(entry.title.toLowerCase()) ?? 0) + 1);
  for (const entry of map.values()) entry.sharedTitle = counts.get(entry.title.toLowerCase()) > 1;
}

async function loadAll() {
  const next = new Map();
  const changed = await git.lastChanged();
  for (const [kind, folder] of Object.entries(KINDS)) {
    const base = path.join(contentDir, folder);
    for (const relative of await walk(base)) {
      const slug = slugFor(relative);
      if (!slug) continue;
      const file = path.join(base, relative);
      try {
        next.set(key(kind, slug), parseEntry(kind, slug, file, await readFile(file, 'utf8'), changed.get(path.relative(contentDir, file).split(path.sep).join('/'))));
      } catch (error) {
        console.error(`Skipping ${relative}: ${error.message}`);
      }
    }
  }
  markSharedTitles(next);
  entries = next;
  version += 1;
}

export async function init() {
  await mkdir(dataDir, { recursive: true });
  await loadAll();
  return entries.size;
}

// Picks up commits made outside the editor (someone pushing to the repository).
export const syncFromRemote = () => git.sync(loadAll);

// ---------- Queries ----------
export const getEntry = (kind, slug) => entries.get(key(kind, slug)) ?? null;

const byDateDesc = (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) || a.slug.localeCompare(b.slug);

export function listEntries(kind, { drafts = false } = {}) {
  return [...entries.values()].filter((entry) => entry.kind === kind && (drafts || !entry.draft)).sort(kind === 'article' ? byDateDesc : (a, b) => a.slug.localeCompare(b.slug));
}

export function listTags() {
  const tags = new Map();
  for (const article of listEntries('article')) {
    for (const tag of article.tags) {
      const slug = tagSlug(tag);
      if (slug && !tags.has(slug)) tags.set(slug, { tag, slug, pretty: toTitleCase(tag.replaceAll('-', ' ')) });
    }
  }
  return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}

export const articlesWithTag = (slug) => listEntries('article').filter((article) => article.tags.some((tag) => tagSlug(tag) === slug));

const tagCounts = () => {
  const counts = new Map();
  for (const article of listEntries('article')) for (const tag of new Set(article.tags.map(tagSlug))) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
};

// Other articles sharing this one's tags. A rare shared tag says more than a
// common one, and between equals the nearest in date wins.
export function relatedArticles(entry, limit = 5) {
  const mine = new Set(entry.tags.map(tagSlug));
  if (mine.size === 0) return [];
  const counts = tagCounts();
  const when = entry.date?.getTime() ?? 0;
  return listEntries('article')
    .filter((article) => article !== entry && article.slug !== entry.slug)
    .map((article) => ({ article, score: [...new Set(article.tags.map(tagSlug))].filter((tag) => mine.has(tag)).reduce((sum, tag) => sum + 1 / Math.sqrt(counts.get(tag) ?? 1), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs((a.article.date?.getTime() ?? 0) - when) - Math.abs((b.article.date?.getTime() ?? 0) - when))
    .slice(0, limit)
    .map((item) => item.article);
}

export const findByWordPressId = (id) => listEntries('article').find((article) => article.wpId === String(id)) ?? null;

// Title and tag matches come first, then matches in the article text.
export function searchArticles(query, { drafts = false } = {}) {
  const all = listEntries('article', { drafts });
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return all;
  const inHeading = (article) => article.title.toLowerCase().includes(needle) || article.tags.some((tag) => tag.toLowerCase().replaceAll('-', ' ').includes(needle));
  const headings = all.filter(inHeading);
  const bodies = all.filter((article) => !inHeading(article) && article.text.toLowerCase().includes(needle));
  return [...headings, ...bodies];
}

// ---------- Writing ----------
async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

const cleanList = (value) => toArray(value).map((item) => item.trim()).filter(Boolean);

// Front matter keys this editor does not know about (id, caption, figure...)
// are left exactly as they were.
function applyFields(text, fields, body) {
  const { frontMatter } = splitSource(text);
  const doc = YAML.parseDocument(frontMatter || '{}');
  const put = (name, value, empty) => (empty ? doc.delete(name) : doc.set(name, value));

  put('title', fields.title.trim(), false);
  if (fields.date !== undefined) put('date', fields.date, !fields.date);
  if (fields.description !== undefined) put('description', String(fields.description).replace(/\s+/g, ' ').trim(), !String(fields.description).trim());
  if (fields.tags !== undefined) put('tags', cleanList(fields.tags), cleanList(fields.tags).length === 0);
  if (fields.todo !== undefined) put('todo', cleanList(fields.todo), cleanList(fields.todo).length === 0);
  if (fields.coverImage !== undefined) put('coverImage', fields.coverImage, !fields.coverImage);
  if (fields.coverImageAlignment !== undefined) put('coverImageAlignment', fields.coverImageAlignment, !fields.coverImage || fields.coverImageAlignment === 'middle');
  if (fields.draft !== undefined) put('draft', true, !fields.draft);

  return `---\n${doc.toString({ lineWidth: 0 })}---\n\n${String(body ?? '').replace(/\r\n/g, '\n').trim()}\n`;
}

export class ContentError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const reload = async (kind, slug, file) => {
  entries.set(key(kind, slug), parseEntry(kind, slug, file, await readFile(file, 'utf8'), new Date()));
  markSharedTitles(entries);
  version += 1;
  return entries.get(key(kind, slug));
};

const describeKind = (kind) => (kind === 'article' ? 'article' : 'page');

export async function createEntry(kind, { slug, title }, editor) {
  const clean = String(slug ?? '').trim().toLowerCase();
  const parts = clean.split('/');
  if (!parts.every((part) => SLUG.test(part)) || (kind === 'article' && parts.length > 1)) {
    throw new ContentError('The web address can only use lower-case letters, numbers and hyphens.');
  }
  if (getEntry('article', clean) || getEntry('page', clean)) throw new ContentError('Something already uses that web address.', 409);
  if (!String(title ?? '').trim()) throw new ContentError('Please give it a title.');

  const file = path.join(contentDir, KINDS[kind], clean, 'index.md');
  const today = new Date().toISOString().slice(0, 10);
  const fields = kind === 'article' ? { title, date: today, draft: true } : { title, draft: true };
  await writeAtomic(file, applyFields('', fields, ''));
  const entry = await reload(kind, clean, file);
  await git.commit(`Start ${describeKind(kind)}: ${entry.title}`, editor, loadAll);
  return entry;
}

export async function saveEntry(kind, slug, { fields, body, revision }, editor) {
  const entry = getEntry(kind, slug);
  if (!entry) throw new ContentError('That no longer exists.', 404);
  const current = await readFile(entry.file, 'utf8');
  if (stamp(current) !== revision) {
    throw new ContentError('Someone else has changed this since you opened it. Copy your text somewhere safe, reload the page and add your changes again.', 412);
  }
  if (!String(fields?.title ?? '').trim()) throw new ContentError('Please give it a title.');
  if (fields.date && !toDate(fields.date)) throw new ContentError('That date is not valid.');

  const next = applyFields(current, fields, body);
  if (next === current) return entry;
  await writeAtomic(entry.file, next);
  const saved = await reload(kind, slug, entry.file);
  await git.commit(`Update ${describeKind(kind)}: ${saved.title}`, editor, loadAll);
  return saved;
}

export async function deleteEntry(kind, slug, editor) {
  const entry = getEntry(kind, slug);
  if (!entry) throw new ContentError('That no longer exists.', 404);
  await rm(entry.hasFolder ? path.dirname(entry.file) : entry.file, { recursive: true });
  entries.delete(key(kind, slug));
  version += 1;
  await git.commit(`Delete ${describeKind(kind)}: ${entry.title}`, editor, loadAll);
}

// ---------- Images ----------
// An article stored as a single file is moved into a folder of its own the
// first time it needs one; its web address does not change.
async function ensureFolder(entry) {
  if (entry.hasFolder) return entry;
  const folder = entry.file.replace(SOURCE, '');
  const moved = path.join(folder, `index${path.extname(entry.file)}`);
  await mkdir(folder, { recursive: true });
  await rename(entry.file, moved);
  return reload(entry.kind, entry.slug, moved);
}

export async function listImages(kind, slug) {
  const entry = getEntry(kind, slug);
  if (!entry?.hasFolder) return [];
  const folder = path.dirname(entry.file);
  const names = (await readdir(folder)).filter((name) => IMAGE.test(name)).sort();
  return names.map((name) => ({ name, source: `./${name}`, url: `${entry.mediaBase}/${name}` }));
}

export async function addImage(kind, slug, { originalName, buffer, extension }, editor) {
  const found = getEntry(kind, slug);
  if (!found) throw new ContentError('That no longer exists.', 404);
  const entry = await ensureFolder(found);
  const folder = path.dirname(entry.file);
  const base = slugify(path.basename(originalName, path.extname(originalName))) || 'image';
  let name = `${base}.${extension}`;
  for (let n = 2; existsSync(path.join(folder, name)); n += 1) name = `${base}-${n}.${extension}`;
  await writeFile(path.join(folder, name), buffer);
  await git.commit(`Add image to ${entry.title}: ${name}`, editor, loadAll);
  return { name, source: `./${name}`, url: `${entry.mediaBase}/${name}` };
}

// Resolves a /media/... request path to a file inside the content folder, or
// null if it is not a servable file.
export async function mediaFile(relative) {
  const file = path.resolve(contentDir, relative);
  if (!file.startsWith(contentDir + path.sep) || SOURCE.test(file) || relative.split('/').some((part) => part.startsWith('.'))) return null;
  const info = await stat(file).catch(() => null);
  return info?.isFile() ? { file, mtimeMs: info.mtimeMs } : null;
}

// Renders unsaved editor contents exactly as the saved entry would appear.
export async function previewEntry(kind, slug, { fields, body }) {
  const existing = getEntry(kind, slug);
  if (!existing) throw new ContentError('That no longer exists.', 404);
  const current = await readFile(existing.file, 'utf8');
  return parseEntry(kind, slug, existing.file, applyFields(current, fields, body));
}
