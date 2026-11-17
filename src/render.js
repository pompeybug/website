// Page templates. Everything public is rendered here on the server as plain,
// semantic HTML; public/js/site.js only adds progressive enhancements.

import { html, raw } from './html.js';
import { tagSlug, toTitleCase } from './content.js';

const SITE_NAME = 'Portsmouth Cycle Forum';
const STRAPLINE = 'Portsmouth Cycle Forum is a group for anyone who cycles, or wants to cycle, in and around Portsmouth UK.';
export const PAGE_SIZE = 16;

const icon = (paths) => raw(`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${paths}</svg>`);
const ICONS = {
  menu: icon('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  close: icon('<path d="M18 6L6 18M6 6l12 12"/>'),
  search: icon('<path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"/>'),
  facebook: icon('<path d="M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2z"/>'),
  instagram: icon('<path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0m7.5-4.5v.01"/>'),
  youtube: icon('<path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path d="m10 9l5 3l-5 3z"/>'),
};

const NAV = [
  { heading: 'Inform', links: [['/', 'Home'], ['/tags', 'Tags'], ['/about', 'About']] },
  { heading: 'Act', links: [['/join', 'Join'], ['/support-us', 'Donate'], ['/report', 'Report'], ['/help', 'Help']] },
];
const SOCIALS = [
  ['https://www.facebook.com/PortsmouthCycleForum', 'Facebook', ICONS.facebook],
  ['https://www.instagram.com/pompey.bike', 'Instagram', ICONS.instagram],
  ['https://youtube.com/@PompeyBUG', 'YouTube', ICONS.youtube],
];

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/London' });
export const formatDate = (date) => dateFormat.format(date).replace(',', '');

export const coverUrl = (entry, width) => (entry.cover ? `${entry.cover}?w=${width}` : null);

// ---------- Layout ----------
function head({ site, title, description, path, image, type = 'website', entry }) {
  const fullTitle = title === SITE_NAME ? title : `${title} - ${SITE_NAME}`;
  const url = `${site.origin}${path}`;
  const shareImage = `${site.origin}${image ?? '/img/og-default.jpg'}`;
  return html`<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${fullTitle}</title>
${description && html`<meta name="description" content="${description}">`}
${site.noindex && html`<meta name="robots" content="noindex, nofollow">`}
<link rel="canonical" href="${url}">
<link rel="icon" href="/img/logo.svg">
<link rel="mask-icon" href="/img/logo-w.svg" color="#FFFFFF">
<meta name="theme-color" content="#c64d0f">
<link rel="sitemap" href="/sitemap.xml">
<link rel="stylesheet" href="/css/site.css?v=${site.assetVersion}">
<script type="module" src="/js/site.js?v=${site.assetVersion}"></script>
<meta property="og:title" content="${title}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${SITE_NAME}">
${description && html`<meta property="og:description" content="${description}">`}
<meta property="og:image" content="${shareImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title}">
${entry?.date && type === 'article' && html`<meta property="article:published_time" content="${entry.date.toISOString()}">`}
${type === 'article' && (entry?.tags ?? []).map((tag) => html`<meta property="article:tag" content="${tag}">`)}
<meta name="twitter:card" content="summary_large_image">`;
}

const tagSection = (tags) =>
  tags?.length > 0 &&
  html`<section>
      <h2>Tags</h2>
      <ul class="innerlist">
        ${tags.map((tag) => html`<li><a class="tag" href="/tags/${tagSlug(tag)}">${toTitleCase(tag)}</a></li>`)}
      </ul>
    </section>`;

export function layout({ site, title, description, path, image, type, entry, tags, main, editLink }) {
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
${head({ site, title, description, path, image, type, entry })}
</head>
<body>
  <header class="site-header">
    <img id="masthead" src="/img/logo-w.svg" alt="">
    <div>
      <button type="button" id="navmenuToggle" aria-label="Open the menu" aria-controls="navmenu" aria-expanded="false">${ICONS.menu}</button>
      <p class="site-title"><a href="/">${SITE_NAME}</a></p>
    </div>
    <p><a href="/">${STRAPLINE}</a></p>
  </header>
  <nav id="navmenu" class="navmenu-hidden" aria-label="Site">
    <header class="close">
      <button type="button" class="close-button" aria-label="Close the menu">${ICONS.close}</button>
      <p class="site-title"><a href="/">${SITE_NAME}</a></p>
    </header>
    ${NAV.map(
      (group) => html`<section>
      <h2>${group.heading}</h2>
      <ul class="innerlist">
        ${group.links.map(([href, label]) => html`<li><a href="${href}">${label}</a></li>`)}
      </ul>
    </section>`,
    )}
    <section>
      <h2>Socials</h2>
      <ul class="socials">
        ${SOCIALS.map(([href, label, glyph]) => html`<li><a href="${href}" title="${label}" aria-label="${label}" target="_blank" rel="noopener me">${glyph}</a></li>`)}
      </ul>
    </section>
    ${tagSection(tags)}
  </nav>
  ${main}
  <footer class="site-footer">
    <p>&copy; ${SITE_NAME} ${new Date().getFullYear()}.</p>
    <p>Volunteers maintain this site - <a href="/help">could you help?</a></p>
    <p><a href="https://passionfruit.design">Website by Passionfruit Design</a></p>
    ${editLink && html`<p><a href="${editLink}">Edit this page</a></p>`}
  </footer>
</body>
</html>`}
`;
}

// ---------- Article cards ----------
export const cardData = (article) => ({
  url: `/${article.slug}`,
  title: article.title,
  date: article.date ? formatDate(article.date) : '',
  isoDate: article.date ? article.date.toISOString().slice(0, 10) : '',
  description: article.description,
  cover: coverUrl(article, 500),
  align: article.coverAlignName,
  draft: article.draft,
  tags: article.tags.map((tag) => ({ label: toTitleCase(tag.replaceAll('-', ' ')), url: `/tags/${tagSlug(tag)}` })),
});

const published = (iso, label, loading = 'lazy') =>
  html`<p class="meta published">
      <img src="/img/calendar.svg" alt="Published" title="Publication date" width="16" height="24" loading="${loading}">
      <time datetime="${iso}">${label}</time>
    </p>`;

// The same markup is used for the server-rendered cards and, with empty
// values, for the <template> that site.js fills in when searching.
function card(data, index) {
  const loading = index < 6 ? 'eager' : 'lazy';
  return html`<li class="card">
    <article>
      <a class="card-image" href="${data.url}" tabindex="-1" aria-hidden="true" data-align="${data.align}">
        <img class="card-cover" src="${data.cover ?? ''}" alt="" loading="${loading}" decoding="async" ${raw(data.cover ? '' : 'hidden')}>
        <img class="card-placeholder" src="/img/logo-w.svg" alt="" loading="${loading}" ${raw(data.cover ? 'hidden' : '')}>
      </a>
      <h2><a href="${data.url}">${data.title}</a></h2>
      ${published(data.isoDate, data.date, loading)}
      <p class="card-description">${data.description}</p>
      <ul class="card-tags">
        ${data.tags.map((tag) => html`<li><a class="no-visit" href="${tag.url}">${tag.label}</a></li>`)}
      </ul>
    </article>
  </li>`;
}

const EMPTY_CARD = { url: '', title: '', date: '', isoDate: '', description: '', cover: null, align: 'middle', tags: [] };

export function renderHome({ site, articles, query, page, editLink }) {
  const pages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const shown = articles.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const link = (n) => `/?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(n > 1 ? { page: n } : {}) })}`.replace(/\?$/, '');

  const main = html`<main class="column">
    <h1>Our Articles</h1>
    <search>
      <form class="search-container" action="/" method="get" role="search">
        <label for="search">${ICONS.search}<span class="visually-hidden">Search articles</span></label>
        <input id="search" class="search-input" type="search" name="q" value="${query}" placeholder="Search..." autocomplete="off">
      </form>
    </search>
    <p id="results" aria-live="polite" ${raw(query ? '' : 'hidden')}>Results: ${articles.length}</p>
    <ul class="cards" data-total="${articles.length}" data-page="${current}">
      ${shown.map((article, index) => card(cardData(article), index))}
    </ul>
    <template id="card-template">${card(EMPTY_CARD, 99)}</template>
    <template id="card-tag-template"><li><a class="no-visit" href=""></a></li></template>
    <nav class="pager" aria-label="More articles">
      ${current > 1 && html`<a rel="prev" href="${link(current - 1)}">Newer articles</a>`}
      ${current < pages && html`<a rel="next" href="${link(current + 1)}">Older articles</a>`}
    </nav>
    <p id="end" ${raw(current < pages ? 'hidden' : '')}>End of results</p>
  </main>`;

  return layout({
    site,
    title: SITE_NAME,
    description: STRAPLINE,
    path: '/',
    main,
    editLink,
  });
}

// ---------- Articles and pages ----------
function hubspot(form) {
  if (!form?.portalId || !form?.formId) return false;
  return html`<section class="hubspot-form" data-region="${form.region ?? 'eu1'}" data-portal="${form.portalId}" data-form="${form.formId}" aria-label="Sign-up form">
      <noscript><p>The sign-up form needs JavaScript. You can also <a href="/contact">contact us</a> to join.</p></noscript>
    </section>`;
}

export function renderEntry({ site, entry, editLink, notice }) {
  const isArticle = entry.kind === 'article';
  const cover =
    entry.cover &&
    html`<figure class="cover">
        <img src="${coverUrl(entry, 1200)}" srcset="${coverUrl(entry, 500)} 500w, ${coverUrl(entry, 800)} 800w, ${coverUrl(entry, 1200)} 1200w" sizes="(width > 60em) 48em, 100vw" alt="${entry.title}" loading="eager">
      </figure>`;

  const main = html`<main>
    <article>
      ${notice && html`<p class="notice" role="status">${notice}</p>`}
      <header>
        <h1 class="title">${entry.title}</h1>
        ${entry.date && published(entry.date.toISOString().slice(0, 10), formatDate(entry.date), 'eager')}
        ${entry.text &&
        html`<p class="meta reading">
          <img src="/img/clock.svg" alt="Estimated reading time" title="Estimated reading time" width="16" height="24">
          ${entry.readingTime}
        </p>`}
      </header>
      ${cover}
      <section class="${entry.floatImages ? 'prose float-images' : 'prose'}">
        ${raw(entry.html)}
      </section>
      ${hubspot(entry.hubspotForm)}
      ${entry.todo.length > 0 &&
      html`<footer class="todo">
        <h2>Work in progress&hellip;</h2>
        <ul>
          ${entry.todo.map((item) => html`<li>${item}</li>`)}
        </ul>
      </footer>`}
    </article>
  </main>`;

  return layout({
    site,
    title: entry.title,
    description: entry.description || `An article by the ${SITE_NAME}`,
    path: `/${entry.slug}`,
    image: entry.cover ? `${entry.cover}?og=1` : null,
    type: isArticle ? 'article' : 'website',
    entry,
    tags: entry.tags,
    main,
    editLink,
  });
}

// ---------- Lists ----------
export function renderTags({ site, tags }) {
  const main = html`<main class="column">
    <h1>Tags</h1>
    <p>Articles on this site are tagged to aid navigation. This page lists all the tags currently in use.</p>
    <search class="search-container">
      <label for="tag-filter">${ICONS.search}<span class="visually-hidden">Filter tags</span></label>
      <input id="tag-filter" class="search-input" type="search" placeholder="Filter tags..." autocomplete="off">
    </search>
    <ul id="tag-list">
      ${tags.map(({ slug, pretty }) => html`<li><a href="/tags/${slug}">${pretty}</a></li>`)}
    </ul>
  </main>`;
  return layout({ site, title: 'Tags', description: 'Every tag used on Portsmouth Cycle Forum articles.', path: '/tags', main });
}

const articleList = (articles, withTodo = false) =>
  html`<ol class="menu">
      ${articles.map(
        (article) => html`<li>
        <a href="/${article.slug}">${article.title}</a>
        ${withTodo && html`<ul>${article.todo.map((item) => html`<li>${item}</li>`)}</ul>`}
      </li>`,
      )}
    </ol>`;

export function renderTag({ site, tag, articles }) {
  const main = html`<main>
    <h1>Tag: ${tag.pretty}</h1>
    <p>A list of articles that have been tagged: <a href="/tags/${tag.slug}">${tag.pretty}</a></p>
    ${articleList(articles)}
  </main>`;
  return layout({ site, title: `Articles with ${tag.pretty} tag`, path: `/tags/${tag.slug}`, main });
}

export function renderList({ site, title, intro, path, articles, withTodo }) {
  const main = html`<main>
    <h1>${title}</h1>
    <p>${intro}</p>
    ${articleList(articles, withTodo)}
  </main>`;
  return layout({ site, title, path, main });
}

export function renderNotFound({ site, entry }) {
  const main = html`<main>
    <article>
      <header><h1 class="title">${entry?.title ?? 'Page Not Found'}</h1></header>
      <section class="prose">
        ${entry?.html ? raw(entry.html) : html`<p>Sorry, there is nothing at this address.</p>`}
        <p><a href="/">Go to the home page</a> or <a href="/tags">browse by tag</a>.</p>
      </section>
    </article>
  </main>`;
  return layout({ site: { ...site, noindex: true }, title: entry?.title ?? 'Page Not Found', path: '/404', main });
}
