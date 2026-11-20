// Page templates. Everything public is rendered here on the server as plain,
// semantic HTML; public/js/site.js only adds progressive enhancements.
// The look is "Campaign": black and orange, big photographs, heavy headlines.

import { html, raw } from './html.js';
import { entryUrl, listEntries, tagSlug, toTitleCase } from './content.js';
import { resolvedHome, resolvedMenu } from './settings.js';
import { SECTIONS, TOPIC_GROUPS, getSection } from './taxonomy.js';

export const SITE_NAME = 'Portsmouth Cycle Forum';
const HOME_TITLE = `${SITE_NAME} | Cycling campaign group for Portsmouth`;
const TITLE_LENGTH = 60;
const STRAPLINE = 'Portsmouth Cycle Forum is a group for anyone who cycles, or wants to cycle, in and around Portsmouth UK.';
export const PAGE_SIZE = 18;

const SOCIALS = ['https://www.facebook.com/PortsmouthCycleForum', 'https://www.instagram.com/pompey.bike', 'https://youtube.com/@PompeyBUG'];

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/London' });
export const formatDate = (date) => dateFormat.format(date).replace(',', '');
const monthFormat = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', timeZone: 'Europe/London' });
const shortFormat = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/London' });
const isoDay = (date) => date.toISOString().slice(0, 10);

export const coverUrl = (entry, width) => (entry.cover ? `${entry.cover}?w=${width}` : null);

// ---------- Structured data ----------
// Read by search engines; a "<" is escaped so the text cannot end the script.
const structured = (data) => raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);

const organisation = (site) => ({
  '@type': 'NGO',
  '@id': `${site.origin}/#organisation`,
  name: SITE_NAME,
  alternateName: ['PCF', 'Pompey BUG'],
  url: `${site.origin}/`,
  logo: { '@type': 'ImageObject', url: `${site.origin}/img/icon-512.png`, width: 512, height: 512 },
  description: STRAPLINE,
  email: 'info@pompeybug.co.uk',
  areaServed: { '@type': 'City', name: 'Portsmouth', containedInPlace: { '@type': 'AdministrativeArea', name: 'Hampshire, England' } },
  knowsAbout: ['Cycling', 'Cycle campaigning', 'Active travel', 'Cycle routes in Portsmouth'],
  sameAs: SOCIALS,
});

function breadcrumbs(site, trail) {
  if (trail.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `${site.origin}${path}` })),
  };
}

const graph = (...items) => structured({ '@context': 'https://schema.org', '@graph': items.filter(Boolean) });

// ---------- Layout ----------
// A long title is shown without the site name, so it is not cut off in results.
export function pageTitle(title) {
  if (title === SITE_NAME) return HOME_TITLE;
  const full = `${title} | ${SITE_NAME}`;
  return full.length <= TITLE_LENGTH ? full : title;
}

function head({ site, title, seoTitle, description, path, image, type = 'website', entry, robots, data }) {
  const url = `${site.origin}${path}`;
  const shareImage = `${site.origin}${image ?? '/img/og-default.jpg'}`;
  const robotsValue = site.noindex ? 'noindex, nofollow' : robots;
  return html`<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle(seoTitle ?? title)}</title>
${description && html`<meta name="description" content="${description}">`}
${robotsValue && html`<meta name="robots" content="${robotsValue}">`}
${site.verification && html`<meta name="google-site-verification" content="${site.verification}">`}
<link rel="canonical" href="${url}">
<link rel="icon" href="/img/logo.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/img/icon-180.png">
<link rel="mask-icon" href="/img/logo-w.svg?v=2" color="#FFFFFF">
<meta name="theme-color" content="#111111">
<link rel="sitemap" href="/sitemap.xml">
<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} articles" href="/feed.xml">
<link rel="stylesheet" href="/css/site.css?v=${site.assetVersion}">
<script type="module" src="/js/site.js?v=${site.assetVersion}"></script>
<meta property="og:title" content="${seoTitle ?? title}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="en_GB">
${description && html`<meta property="og:description" content="${description}">`}
<meta property="og:image" content="${shareImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title}">
${entry?.date && type === 'article' && html`<meta property="article:published_time" content="${entry.date.toISOString()}">`}
${entry?.modified && type === 'article' && html`<meta property="article:modified_time" content="${entry.modified.toISOString()}">`}
${type === 'article' && (entry?.tags ?? []).map((tag) => html`<meta property="article:tag" content="${tag}">`)}
<meta name="twitter:card" content="summary_large_image">
${data}`;
}

const current = (href, path) => raw(href === path ? 'aria-current="page"' : '');
const outside = (item) => raw(item.outside ? 'rel="noopener me"' : '');

// "menu" and, on the home page, "home" are passed only by the editor's
// preview, which draws settings that have not been saved yet.
export function layout({ site, title, seoTitle, description, path, image, type, entry, main, editLink, robots, data, menu = resolvedMenu() }) {
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
${head({ site, title, seoTitle, description, path, image, type, entry, robots, data })}
</head>
<body>
  <a class="skip" href="#content">Skip to the content</a>
  <header class="top">
    <a class="brand" href="/">
      <img src="/img/logo.svg" alt="" width="78" height="43">
      <span>${SITE_NAME}</span>
    </a>
    <button type="button" class="menu-toggle" id="site-menu-toggle" aria-controls="site-menu" aria-expanded="false" hidden>Menu</button>
    <a class="button" href="/join">Join us</a>
    <nav class="primary" id="site-menu" aria-label="Site">
      <ul>
        ${menu.primary.map(
          (item) => html`<li data-item="${item.index}">
          <a href="${item.href}" ${outside(item)} ${current(item.href, path)}>${item.label}</a>
          ${item.children.length > 0 &&
          html`<ul class="sub">
            ${item.children.map((child) => html`<li><a href="${child.href}" ${outside(child)} ${current(child.href, path)}>${child.label}</a></li>`)}
          </ul>`}
        </li>`,
        )}
      </ul>
    </nav>
  </header>
  ${main}
  <footer class="foot">
    <nav aria-label="Footer">
      ${menu.footer.map(
        (group) => html`<section>
        <h2>${group.href ? html`<a href="${group.href}" ${outside(group)}>${group.label}</a>` : group.label}</h2>
        <ul>
          ${group.children.map((child) => html`<li><a href="${child.href}" ${outside(child)}>${child.label}</a></li>`)}
        </ul>
      </section>`,
      )}
    </nav>
    <p>&copy; ${SITE_NAME} ${new Date().getFullYear()}. Volunteers maintain this site - <a href="/help">could you help?</a></p>
    <p><a href="https://passionfruit.design">Hosted and supported by Passionfruit Design</a></p>
    ${editLink && html`<p><a href="${editLink}">Edit this page</a></p>`}
  </footer>
</body>
</html>`}
`;
}

// ---------- Pieces ----------
export const cardData = (article) => ({
  url: entryUrl(article),
  title: article.title,
  date: article.date ? shortFormat.format(article.date) : '',
  isoDate: article.date ? isoDay(article.date) : '',
  cover: coverUrl(article, 600),
  align: article.coverAlignName,
  section: getSection(article.section)?.title ?? '',
});

// A card with its title on the photograph. The same markup is used, with
// empty values, for the <template> that site.js fills in when searching.
function card(data, { level = 'h3', loading = 'lazy' } = {}) {
  const heading = html`<a href="${data.url}">${data.title}</a>`;
  return html`<li>
      <article>
        <figure class="thumb" data-align="${data.align}">
          <img class="card-cover" src="${data.cover ?? ''}" alt="" loading="${loading}" decoding="async" ${raw(data.cover ? '' : 'hidden')}>
          <img class="empty" src="/img/logo-w.svg?v=2" alt="" loading="${loading}" ${raw(data.cover ? 'hidden' : '')}>
        </figure>
        <p class="kicker">${data.section}</p>
        ${level === 'h2' ? html`<h2>${heading}</h2>` : html`<h3>${heading}</h3>`}
        <time datetime="${data.isoDate}">${data.date}</time>
      </article>
    </li>`;
}

const EMPTY_CARD = { url: '', title: '', date: '', isoDate: '', cover: null, align: 'middle', section: '' };

const dated = (article, withTodo = false) =>
  html`<li>
      <a href="${entryUrl(article)}">${article.title}</a>
      ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
      ${withTodo && html`<ul>${article.todo.map((item) => html`<li>${item}</li>`)}</ul>`}
    </li>`;

const crumbs = (trail) =>
  html`<nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        ${trail.map(([name, href]) => html`<li><a href="${href}">${name}</a></li>`)}
      </ol>
    </nav>`;

const pageHead = ({ trail = [['Home', '/']], title, lede }) =>
  html`<header class="page-head">
      ${crumbs(trail)}
      <h1>${title}</h1>
      ${lede && html`<p class="lede">${lede}</p>`}
    </header>`;

const band = (name, heading, more, body) =>
  html`<section class="band ${name}">
      <header>
        <h2>${heading}</h2>
        ${more && html`<a class="more" href="${more[0]}">${more[1]}</a>`}
      </header>
      ${body}
    </section>`;

const website = (site) => ({
  '@type': 'WebSite',
  '@id': `${site.origin}/#website`,
  url: `${site.origin}/`,
  name: SITE_NAME,
  inLanguage: 'en-GB',
  publisher: { '@id': `${site.origin}/#organisation` },
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${site.origin}/articles?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
});

// ---------- Home ----------
// The front door: what the forum is for, what a visitor can do here and what
// it is working on. Its words, picture and boxes are edited at /edit/home.
export function renderHome({ site, editLink, home = resolvedHome(), menu }) {
  const articles = listEntries('article');
  const first = articles.at(-1)?.date?.getUTCFullYear();
  const features = (list) => html`<ul class="features">${list.map((article) => card(cardData(article)))}</ul>`;

  const main = html`<main id="content" class="home">
    <section class="hero">
      <header>
        ${home.kicker && html`<p class="kicker">${home.kicker}</p>`}
        <h1>${home.headline}</h1>
        ${home.intro && html`<p class="lede">${home.intro}</p>`}
        <p class="actions">
          <a class="button" href="/join">Join us</a>
          <a class="button quiet" href="/report">Report a problem</a>
        </p>
      </header>
      ${home.heroImage &&
      html`<figure>
        <img src="${home.heroImage}?w=1200" srcset="${home.heroImage}?w=800 800w, ${home.heroImage}?w=1200 1200w" sizes="100vw" alt="${home.heroAlt}" fetchpriority="high">
      </figure>`}
    </section>
    ${home.campaigns.length > 0 && band('campaigns', 'What we are campaigning on', ['/campaigns', 'All campaigns'], features(home.campaigns))}
    ${home.tasks.length > 0 &&
    band(
      'tasks',
      home.tasksHeading,
      ['/guides', 'All guides'],
      html`<ul>
        ${home.tasks.map((task) => html`<li><a href="${task.href}"><strong>${task.title}</strong> <span>${task.text}</span></a></li>`)}
      </ul>`,
    )}
    ${home.stories.length > 0 && band('stories', 'People who ride here', ['/stories', 'More stories'], features(home.stories))}
    <section class="join">
      <h2>${home.joinHeading}</h2>
      ${home.joinText && html`<p>${home.joinText}</p>`}
      <p class="actions">
        <a class="button" href="/join">Join us</a>
        <a class="button quiet" href="/support-us">Donate</a>
      </p>
    </section>
    ${home.showLatest &&
    band(
      'latest',
      'Latest',
      ['/archive', `Archive: all ${articles.length} articles since ${first}`],
      html`<ol class="dated">${articles.slice(0, 6).map((article) => dated(article))}</ol>`,
    )}
  </main>`;

  return layout({
    site,
    title: SITE_NAME,
    description: `${STRAPLINE} News, campaigns, rides and meetings since 2007.`,
    path: '/',
    image: home.heroImage ? `${home.heroImage}?og=1` : null,
    data: graph(organisation(site), website(site)),
    main,
    editLink,
    menu,
  });
}

// ---------- Lists of cards ----------
const ALL = { slug: 'articles', title: 'Latest articles', intro: 'Everything we have published, newest first. Search by a word, a place or a name.' };

const chips = (name, label, links, here) =>
  html`<nav class="${name}" aria-label="${label}">
      <ul class="chips">
        ${links.map(([href, text, count]) => html`<li><a href="${href}" ${current(href, here)}>${text}${count && html` <small>${count}</small>`}</a></li>`)}
      </ul>
    </nav>`;

const sectionNav = (here) => chips('sections', 'Sections', [['/articles', 'Latest'], ...SECTIONS.map((section) => [`/${section.slug}`, section.title]), ['/tags', 'Topics']], here);

// One section's articles, or all of them at /articles, with a search.
export function renderListing({ site, articles, query, page, editLink, section = null, topics = [] }) {
  const shownAs = section ?? ALL;
  const base = `/${shownAs.slug}`;
  const pages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const now = Math.min(Math.max(1, page), pages);
  const shown = articles.slice((now - 1) * PAGE_SIZE, now * PAGE_SIZE);
  const link = (n) => `${base}?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(n > 1 ? { page: n } : {}) })}`.replace(/\?$/, '');
  const heading = query ? `${section ? `${section.title}: articles` : 'Articles'} matching “${query}”` : shownAs.title;
  const prompt = section ? `Search ${section.title.toLowerCase()}` : 'Search all articles';

  const main = html`<main id="content" class="listing">
    ${pageHead({ title: heading, lede: !query && shownAs.intro })}
    ${sectionNav(base)}
    ${topics.length > 0 &&
    !query &&
    html`<nav class="topics" aria-label="Topics in ${shownAs.title}">
      <h2>Topics</h2>
      <ul class="chips">
        ${topics.map((tag) => html`<li><a href="/tags/${tag.slug}">${tag.pretty} <small>${tag.count}</small></a></li>`)}
      </ul>
    </nav>`}
    <search>
      <form class="search" action="${base}" method="get" role="search">
        <label for="search">${prompt}</label>
        <input id="search" type="search" name="q" value="${query}" autocomplete="off">
        <button type="submit" class="button">Search</button>
      </form>
    </search>
    <p id="results" aria-live="polite" ${raw(query ? '' : 'hidden')}>Results: ${articles.length}</p>
    <ul class="features cards" data-pages="${pages}" data-page="${now}" data-section="${section?.slug ?? ''}">
      ${shown.map((article, index) => card(cardData(article), { level: 'h2', loading: index < 6 ? 'eager' : 'lazy' }))}
    </ul>
    <template id="card-template">${card(EMPTY_CARD, { level: 'h2' })}</template>
    <nav class="pager" aria-label="More articles">
      ${now > 1 && html`<a rel="prev" href="${link(now - 1)}">Newer articles</a>`}
      ${now < pages && html`<a rel="next" href="${link(now + 1)}">Older articles</a>`}
    </nav>
    <p id="end" ${raw(now < pages ? 'hidden' : '')}>End of results</p>
  </main>`;

  const collection = {
    '@type': 'CollectionPage',
    '@id': `${site.origin}${base}#page`,
    url: `${site.origin}${base}`,
    name: shownAs.title,
    description: shownAs.intro,
    isPartOf: { '@id': `${site.origin}/#website` },
  };

  return layout({
    site,
    title: shownAs.title,
    seoTitle: now > 1 ? `${shownAs.title}, page ${now} of ${pages}` : section ? `${section.title}: cycling in Portsmouth` : 'Latest articles and search',
    description: `${shownAs.intro} ${articles.length} articles from ${SITE_NAME}.`,
    // Every page of the list is its own address; search results are not indexed.
    path: now > 1 ? `${base}?page=${now}` : base,
    robots: query ? 'noindex, follow' : undefined,
    data: now === 1 && !query ? graph(collection, breadcrumbs(site, [['Home', '/'], [shownAs.title, base]])) : undefined,
    main,
    editLink,
  });
}

// ---------- Articles and pages ----------
function hubspot(form) {
  return html`<section class="hubspot-form" data-region="${form.region ?? 'eu1'}" data-portal="${form.portalId}" data-form="${form.formId}" aria-label="Sign-up form">
      <noscript><p>The sign-up form needs JavaScript. You can also <a href="/contact">contact us</a> to join.</p></noscript>
    </section>`;
}

export function renderEntry({ site, entry, editLink, notice, related = [], parents = [] }) {
  const isArticle = entry.kind === 'article';
  const section = isArticle ? getSection(entry.section) : null;
  const above = section ? [[section.title, `/${section.slug}`]] : parents.map((parent) => [parent.title, entryUrl(parent)]);
  const trail = [['Home', '/'], ...above, [entry.title, entryUrl(entry)]];
  // A page with a sign-up form is laid out around the form.
  const signup = Boolean(entry.hubspotForm?.portalId && entry.hubspotForm?.formId);

  const main = html`<main id="content" class="${signup ? 'entry signup' : 'entry'}">
    <article>
      <header class="page-head">
        ${crumbs(trail.slice(0, -1))}
        ${notice && html`<p class="notice" role="status">${notice}</p>`}
        <h1>${entry.title}</h1>
        ${entry.date &&
        isArticle &&
        html`<p class="meta">
          <time datetime="${isoDay(entry.date)}">${formatDate(entry.date)}</time>
          ${entry.text && html`<span>${entry.readingTime}</span>`}
        </p>`}
      </header>
      ${entry.cover &&
      html`<figure class="cover">
        <img src="${coverUrl(entry, 1200)}" srcset="${coverUrl(entry, 500)} 500w, ${coverUrl(entry, 800)} 800w, ${coverUrl(entry, 1200)} 1200w" sizes="(min-width: 72rem) 72rem, 100vw" alt="${entry.title}" loading="eager" fetchpriority="high">
      </figure>`}
      <section class="${entry.floatImages ? 'prose float-images' : 'prose'}">
        ${raw(entry.html)}
        ${entry.todo.length > 0 &&
        html`<aside class="todo">
          <h2>Work in progress&hellip;</h2>
          <ul>
            ${entry.todo.map((item) => html`<li>${item}</li>`)}
          </ul>
        </aside>`}
      </section>
      ${signup &&
      html`<section class="signup-panel" aria-labelledby="signup-heading">
        <h2 id="signup-heading">Sign up</h2>
        ${hubspot(entry.hubspotForm)}
      </section>`}
      ${isArticle &&
      html`<footer>
        <nav class="filed" aria-label="Topics">
          <h2>Filed under</h2>
          <ul class="chips">
            <li><a href="/${section.slug}">${section.title}</a></li>
            ${entry.tags.map((tag) => html`<li><a href="/tags/${tagSlug(tag)}">${toTitleCase(tag.replaceAll('-', ' '))}</a></li>`)}
          </ul>
        </nav>
        ${related.length > 0 &&
        html`<nav class="related" aria-label="Related articles">
          <h2>Related articles</h2>
          <ol class="dated">${related.map((article) => dated(article))}</ol>
        </nav>`}
      </footer>`}
    </article>
  </main>`;

  const url = `${site.origin}${entryUrl(entry)}`;
  const description = entry.description || `${entry.title}, from ${SITE_NAME}.`;
  const thing = isArticle
    ? {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: entry.title.slice(0, 110),
        description,
        datePublished: entry.date?.toISOString(),
        dateModified: (entry.modified ?? entry.date)?.toISOString(),
        image: entry.cover ? [`${site.origin}${entry.cover}?og=1`] : undefined,
        author: entry.author ? { '@type': 'Person', name: entry.author } : { '@id': `${site.origin}/#organisation` },
        publisher: { '@id': `${site.origin}/#organisation` },
        mainEntityOfPage: url,
        inLanguage: 'en-GB',
        articleSection: section.title,
        keywords: entry.tags.length > 0 ? entry.tags.map((tag) => tag.replaceAll('-', ' ')).join(', ') : undefined,
        wordCount: entry.text ? entry.text.split(' ').length : undefined,
      }
    : { '@type': entry.slug === 'about' ? 'AboutPage' : entry.slug === 'contact' ? 'ContactPage' : 'WebPage', '@id': `${url}#page`, url, name: entry.title, description, inLanguage: 'en-GB', about: { '@id': `${site.origin}/#organisation` } };

  return layout({
    site,
    title: entry.title,
    // "Open Meeting" was used many times; the month tells the results apart.
    seoTitle: isArticle && entry.sharedTitle && entry.date ? `${entry.title}, ${monthFormat.format(entry.date)}` : undefined,
    description,
    path: entryUrl(entry),
    robots: entry.noindex ? 'noindex, follow' : undefined,
    data: graph(organisation(site), thing, breadcrumbs(site, trail)),
    image: entry.cover ? `${entry.cover}?og=1` : null,
    type: isArticle ? 'article' : 'website',
    entry,
    main,
    editLink,
  });
}

// ---------- Lists ----------
const topicLink = (tag) => html`<li><a href="/tags/${tag.slug}">${tag.pretty} <small>${tag.count}</small></a></li>`;

export function renderTags({ site, tags }) {
  const bySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const main = html`<main id="content" class="listing">
    ${pageHead({ title: 'Topics', lede: 'Find articles by subject. The number beside each topic is how many articles it has.' })}
    ${sectionNav('/tags')}
    ${TOPIC_GROUPS.map(
      (group) => html`<section class="topic-group">
      <h2>${group.title}</h2>
      <ul class="chips">
        ${group.tags.map((slug) => bySlug.get(slug)).filter(Boolean).map(topicLink)}
      </ul>
    </section>`,
    )}
    <section class="topic-group">
      <h2>Every topic, A to Z</h2>
      <search class="search">
        <label for="tag-filter">Filter topics</label>
        <input id="tag-filter" type="search" autocomplete="off">
      </search>
      <ul id="tag-list" class="chips">
        ${tags.map(topicLink)}
      </ul>
    </section>
  </main>`;
  return layout({
    site,
    title: 'Topics',
    description: `Browse ${SITE_NAME} articles by topic: all ${tags.length} of them, from the seafront cycle route and Eastern Road to elections, rides and meetings.`,
    path: '/tags',
    data: graph(breadcrumbs(site, [['Home', '/'], ['Topics', '/tags']])),
    main,
  });
}

const articleList = (articles, withTodo = false) => html`<ol class="dated">${articles.map((article) => dated(article, withTodo))}</ol>`;

const years = (articles) => `${articles.at(-1).date?.getUTCFullYear() ?? ''}`.concat(articles[0].date?.getUTCFullYear() === articles.at(-1).date?.getUTCFullYear() ? '' : ` to ${articles[0].date?.getUTCFullYear()}`);

export function renderTag({ site, tag, articles }) {
  const count = articles.length === 1 ? '1 article' : `${articles.length} articles`;
  const main = html`<main id="content" class="listing">
    ${pageHead({ trail: [['Home', '/'], ['Topics', '/tags']], title: tag.pretty, lede: `${count} from ${SITE_NAME} on this topic, newest first.` })}
    <section>${articleList(articles)}</section>
  </main>`;
  const path = `/tags/${tag.slug}`;
  const list = {
    '@type': 'CollectionPage',
    '@id': `${site.origin}${path}#page`,
    url: `${site.origin}${path}`,
    name: `${tag.pretty} articles`,
    isPartOf: { '@id': `${site.origin}/#website` },
    mainEntity: { '@type': 'ItemList', numberOfItems: articles.length, itemListElement: articles.slice(0, 50).map((article, index) => ({ '@type': 'ListItem', position: index + 1, url: `${site.origin}${entryUrl(article)}`, name: article.title })) },
  };
  return layout({
    site,
    title: `${tag.pretty} articles`,
    description: `${count} about ${tag.pretty} from ${SITE_NAME} (${years(articles)}), including ${articles.slice(0, 2).map((article) => `“${article.title}”`).join(' and ')}.`,
    path,
    // A tag used once only repeats its one article.
    robots: articles.length < 2 ? 'noindex, follow' : undefined,
    data: graph(list, breadcrumbs(site, [['Home', '/'], ['Topics', '/tags'], [tag.pretty, path]])),
    main,
  });
}

export function renderArchive({ site, articles }) {
  const byYear = Map.groupBy(articles, (article) => article.date?.getUTCFullYear() ?? 'Undated');
  const main = html`<main id="content" class="listing">
    ${pageHead({ title: 'All articles', lede: `Every article published by ${SITE_NAME}: ${articles.length} in all, newest first.` })}
    ${chips('years', 'Years', [...byYear.keys()].map((year) => [`#y${year}`, year]), '')}
    ${[...byYear].map(
      ([year, list]) => html`<section class="year" id="y${year}">
      <h2>${year}</h2>
      ${articleList(list)}
    </section>`,
    )}
  </main>`;
  return layout({
    site,
    title: 'All articles',
    description: `The full archive of ${SITE_NAME}: ${articles.length} articles on cycling campaigns, routes, rides and meetings in Portsmouth, ${years(articles)}.`,
    path: '/archive',
    data: graph(breadcrumbs(site, [['Home', '/'], ['All articles', '/archive']])),
    main,
  });
}

// Housekeeping lists for editors; not for search engines.
export function renderList({ site, title, intro, path, articles, withTodo }) {
  const main = html`<main id="content" class="listing">
    ${pageHead({ title, lede: intro })}
    <section>${articleList(articles, withTodo)}</section>
  </main>`;
  return layout({ site, title, path, main, robots: 'noindex, follow' });
}

export function renderNotFound({ site, entry }) {
  const title = entry?.title ?? 'Page Not Found';
  const main = html`<main id="content" class="entry">
    <article>
      ${pageHead({ title })}
      <section class="prose">
        ${entry?.html ? raw(entry.html) : html`<p>Sorry, there is nothing at this address.</p>`}
        <p><a href="/">Go to the home page</a>, <a href="/articles">search the articles</a>, <a href="/tags">browse by topic</a> or see <a href="/archive">every article by year</a>.</p>
      </section>
    </article>
  </main>`;
  return layout({ site, robots: 'noindex, follow', title, path: '/404', main });
}

// ---------- Feed ----------
const xml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

export function renderFeed({ site, articles }) {
  const items = articles.map(
    (article) => `<item>
<title>${xml(article.title)}</title>
<link>${site.origin}/${xml(article.slug)}</link>
<guid isPermaLink="true">${site.origin}/${xml(article.slug)}</guid>
${article.date ? `<pubDate>${article.date.toUTCString()}</pubDate>` : ''}
<description>${xml(article.description)}</description>
${article.tags.map((tag) => `<category>${xml(tag)}</category>`).join('')}
</item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(SITE_NAME)}</title>
<link>${site.origin}/</link>
<atom:link href="${site.origin}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${xml(STRAPLINE)}</description>
<language>en-gb</language>
${items.join('\n')}
</channel>
</rss>
`;
}
