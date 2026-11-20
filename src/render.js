// Page templates. Everything public is rendered here on the server as plain,
// semantic HTML; public/js/site.js only adds progressive enhancements.

import { html, raw } from './html.js';
import { tagSlug, toTitleCase } from './content.js';
import { SECTIONS, TOPIC_GROUPS, getSection } from './taxonomy.js';

export const SITE_NAME = 'Portsmouth Cycle Forum';
const HOME_TITLE = `${SITE_NAME} | Cycling campaign group for Portsmouth`;
const TITLE_LENGTH = 60;
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
  { heading: 'Read', links: [['/', 'Latest'], ...SECTIONS.map((section) => [`/${section.slug}`, section.title])] },
  { heading: 'Find', links: [['/tags', 'Topics'], ['/archive', 'All articles by year']] },
  { heading: 'Act', links: [['/join', 'Join'], ['/support-us', 'Donate'], ['/report', 'Report a problem'], ['/help', 'Help us']] },
  { heading: 'About', links: [['/about', 'Who we are'], ['/contact', 'Contact']] },
];
const SOCIALS = [
  ['https://www.facebook.com/PortsmouthCycleForum', 'Facebook', ICONS.facebook],
  ['https://www.instagram.com/pompey.bike', 'Instagram', ICONS.instagram],
  ['https://youtube.com/@PompeyBUG', 'YouTube', ICONS.youtube],
];

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
  sameAs: SOCIALS.map(([href]) => href),
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
<meta name="theme-color" content="#c64d0f">
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

const tagSection = (tags) =>
  tags?.length > 0 &&
  html`<section>
      <h2>Tags</h2>
      <ul class="innerlist">
        ${tags.map((tag) => html`<li><a class="tag" href="/tags/${tagSlug(tag)}">${toTitleCase(tag)}</a></li>`)}
      </ul>
    </section>`;

export function layout({ site, title, seoTitle, description, path, image, type, entry, tags, main, editLink, robots, data }) {
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
${head({ site, title, seoTitle, description, path, image, type, entry, robots, data })}
</head>
<body>
  <header class="site-header">
    <img id="masthead" src="/img/logo-w.svg?v=2" alt="">
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
    <p><a href="https://passionfruit.design">Hosted and supported by Passionfruit Design</a></p>
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
        <img class="card-placeholder" src="/img/logo-w.svg?v=2" alt="" loading="${loading}" ${raw(data.cover ? 'hidden' : '')}>
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

const sectionNav = (current) =>
  html`<nav class="sections" aria-label="Sections">
      <ul class="card-tags">
        <li><a href="/" ${raw(current ? '' : 'aria-current="page"')}>Latest</a></li>
        ${SECTIONS.map((section) => html`<li><a href="/${section.slug}" ${raw(current === section.slug ? 'aria-current="page"' : '')}>${section.title}</a></li>`)}
        <li><a href="/tags">Topics</a></li>
      </ul>
    </nav>`;

// The home page and each section page are the same list of cards: all the
// articles, or those of one section.
export function renderListing({ site, articles, query, page, editLink, section = null, topics = [] }) {
  const base = section ? `/${section.slug}` : '/';
  const pages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const shown = articles.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const link = (n) => `${base}?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(n > 1 ? { page: n } : {}) })}`.replace(/\?$/, '');
  const name = section ? section.title : 'Cycling news and campaigns in Portsmouth';
  const heading = query ? `${section ? `${section.title}: articles` : 'Articles'} matching “${query}”` : name;
  const prompt = section ? `Search ${section.title.toLowerCase()}...` : 'Search all articles...';

  const main = html`<main class="column">
    <h1>${heading}</h1>
    ${section && !query && html`<p class="intro">${section.intro}</p>`}
    ${sectionNav(section?.slug)}
    ${topics.length > 0 &&
    !query &&
    html`<nav class="topics" aria-label="Topics in ${section.title}">
      <h2>Topics</h2>
      <ul class="card-tags">
        ${topics.map((tag) => html`<li><a href="/tags/${tag.slug}">${tag.pretty} <small>${tag.count}</small></a></li>`)}
      </ul>
    </nav>`}
    <search>
      <form class="search-container" action="${base}" method="get" role="search">
        <label for="search">${ICONS.search}<span class="visually-hidden">${prompt}</span></label>
        <input id="search" class="search-input" type="search" name="q" value="${query}" placeholder="${prompt}" autocomplete="off">
      </form>
    </search>
    <p id="results" aria-live="polite" ${raw(query ? '' : 'hidden')}>Results: ${articles.length}</p>
    <ul class="cards" data-total="${articles.length}" data-page="${current}" data-section="${section?.slug ?? ''}">
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

  const website = {
    '@type': 'WebSite',
    '@id': `${site.origin}/#website`,
    url: `${site.origin}/`,
    name: SITE_NAME,
    inLanguage: 'en-GB',
    publisher: { '@id': `${site.origin}/#organisation` },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${site.origin}/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
  const collection = section && {
    '@type': 'CollectionPage',
    '@id': `${site.origin}${base}#page`,
    url: `${site.origin}${base}`,
    name: section.title,
    description: section.intro,
    isPartOf: { '@id': `${site.origin}/#website` },
  };
  const first = current === 1 && !query;
  const title = section ? section.title : SITE_NAME;

  return layout({
    site,
    title,
    seoTitle: current > 1 ? `${section ? section.title : 'Articles'}, page ${current} of ${pages}` : section ? `${section.title}: cycling in Portsmouth` : undefined,
    description: section ? `${section.intro} ${articles.length} articles from ${SITE_NAME}.` : `${STRAPLINE} News, campaigns, rides and meetings since 2007.`,
    // Every page of the list is its own address; search results are not indexed.
    path: current > 1 ? `${base}?page=${current}` : base,
    robots: query ? 'noindex, follow' : undefined,
    data: first ? (section ? graph(collection, breadcrumbs(site, [['Home', '/'], [section.title, base]])) : graph(organisation(site), website)) : undefined,
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

const datedLink = (article) =>
  html`<li>
      <a href="/${article.slug}">${article.title}</a>
      ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
    </li>`;

export function renderEntry({ site, entry, editLink, notice, related = [], parents = [] }) {
  const isArticle = entry.kind === 'article';
  const cover =
    entry.cover &&
    html`<figure class="cover">
        <img src="${coverUrl(entry, 1200)}" srcset="${coverUrl(entry, 500)} 500w, ${coverUrl(entry, 800)} 800w, ${coverUrl(entry, 1200)} 1200w" sizes="(width > 60em) 48em, 100vw" alt="${entry.title}" loading="eager" fetchpriority="high">
      </figure>`;

  const section = isArticle ? getSection(entry.section) : null;
  const above = section ? [[section.title, `/${section.slug}`]] : parents.map((parent) => [parent.title, `/${parent.slug}`]);
  const trail = [['Home', '/'], ...above, [entry.title, `/${entry.slug}`]];

  const main = html`<main>
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        ${trail.slice(0, -1).map(([name, href]) => html`<li><a href="${href}">${name}</a></li>`)}
      </ol>
    </nav>
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
    ${isArticle &&
    html`<aside class="filed" aria-label="Topics">
      <h2>Filed under</h2>
      <ul class="card-tags">
        <li><a href="/${section.slug}">${section.title}</a></li>
        ${entry.tags.map((tag) => html`<li><a href="/tags/${tagSlug(tag)}">${toTitleCase(tag.replaceAll('-', ' '))}</a></li>`)}
      </ul>
    </aside>`}
    ${related.length > 0 &&
    html`<aside class="related" aria-label="Related articles">
      <h2>Related articles</h2>
      <ul class="dated">
        ${related.map(datedLink)}
      </ul>
    </aside>`}
  </main>`;

  const url = `${site.origin}/${entry.slug}`;
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
    path: `/${entry.slug}`,
    robots: entry.noindex ? 'noindex, follow' : undefined,
    data: graph(organisation(site), thing, breadcrumbs(site, trail)),
    image: entry.cover ? `${entry.cover}?og=1` : null,
    type: isArticle ? 'article' : 'website',
    entry,
    tags: entry.tags,
    main,
    editLink,
  });
}

// ---------- Lists ----------
const topicLink = (tag) => html`<li><a href="/tags/${tag.slug}">${tag.pretty} <small>${tag.count}</small></a></li>`;

export function renderTags({ site, tags }) {
  const bySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const main = html`<main class="column">
    <h1>Topics</h1>
    <p class="intro">Find articles by subject. The number beside each topic is how many articles it has.</p>
    ${sectionNav('tags')}
    ${TOPIC_GROUPS.map(
      (group) => html`<section class="topic-group">
      <h2>${group.title}</h2>
      <ul class="card-tags">
        ${group.tags.map((slug) => bySlug.get(slug)).filter(Boolean).map(topicLink)}
      </ul>
    </section>`,
    )}
    <section class="topic-group">
      <h2>Every topic, A to Z</h2>
      <search class="search-container">
        <label for="tag-filter">${ICONS.search}<span class="visually-hidden">Filter topics</span></label>
        <input id="tag-filter" class="search-input" type="search" placeholder="Filter topics..." autocomplete="off">
      </search>
      <ul id="tag-list" class="card-tags">
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

const articleList = (articles, withTodo = false) =>
  html`<ol class="menu dated">
      ${articles.map(
        (article) => html`<li>
        <a href="/${article.slug}">${article.title}</a>
        ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
        ${withTodo && html`<ul>${article.todo.map((item) => html`<li>${item}</li>`)}</ul>`}
      </li>`,
      )}
    </ol>`;

const years = (articles) => `${articles.at(-1).date?.getUTCFullYear() ?? ''}`.concat(articles[0].date?.getUTCFullYear() === articles.at(-1).date?.getUTCFullYear() ? '' : ` to ${articles[0].date?.getUTCFullYear()}`);

export function renderTag({ site, tag, articles }) {
  const count = articles.length === 1 ? '1 article' : `${articles.length} articles`;
  const main = html`<main>
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/tags">Topics</a></li>
      </ol>
    </nav>
    <h1>${tag.pretty}</h1>
    <p class="intro">${count} from ${SITE_NAME} on this topic, newest first.</p>
    ${articleList(articles)}
  </main>`;
  const path = `/tags/${tag.slug}`;
  const list = {
    '@type': 'CollectionPage',
    '@id': `${site.origin}${path}#page`,
    url: `${site.origin}${path}`,
    name: `${tag.pretty} articles`,
    isPartOf: { '@id': `${site.origin}/#website` },
    mainEntity: { '@type': 'ItemList', numberOfItems: articles.length, itemListElement: articles.slice(0, 50).map((article, index) => ({ '@type': 'ListItem', position: index + 1, url: `${site.origin}/${article.slug}`, name: article.title })) },
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
  const main = html`<main>
    <h1>All articles</h1>
    <p>Every article published by ${SITE_NAME}: ${articles.length} in all, newest first.</p>
    <nav class="years" aria-label="Years">
      <ul class="card-tags">
        ${[...byYear.keys()].map((year) => html`<li><a href="#y${year}">${year}</a></li>`)}
      </ul>
    </nav>
    ${[...byYear].map(
      ([year, list]) => html`<section id="y${year}">
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
  const main = html`<main>
    <h1>${title}</h1>
    <p>${intro}</p>
    ${articleList(articles, withTodo)}
  </main>`;
  return layout({ site, title, path, main, robots: 'noindex, follow' });
}

export function renderNotFound({ site, entry }) {
  const main = html`<main>
    <article>
      <header><h1 class="title">${entry?.title ?? 'Page Not Found'}</h1></header>
      <section class="prose">
        ${entry?.html ? raw(entry.html) : html`<p>Sorry, there is nothing at this address.</p>`}
        <p><a href="/">Go to the home page</a>, <a href="/tags">browse by topic</a> or see <a href="/archive">every article by year</a>.</p>
      </section>
    </article>
  </main>`;
  return layout({ site, robots: 'noindex, follow', title: entry?.title ?? 'Page Not Found', path: '/404', main });
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
