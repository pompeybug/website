// Design previews. Three candidate looks for the site, each shown on a
// "front door" home page, a section page and any article or page, using the
// real content. Lives under /design and is never indexed. Once a direction is
// chosen its templates and stylesheet replace render.js and site.css, and
// this file goes.

import { Router } from 'express';
import { html, raw } from './html.js';
import * as content from './content.js';
import { SITE_NAME, coverUrl, formatDate } from './render.js';
import { SECTIONS, getSection } from './taxonomy.js';

const DIRECTIONS = [
  { id: 'a', name: 'Civic', logo: '/img/logo.svg', summary: 'Plain, calm and built around tasks, like a public information site. Green leads; orange is kept for the buttons.', home: ['hero', 'tasks', 'campaigns', 'latest', 'stories', 'join'] },
  { id: 'b', name: 'Campaign', logo: '/img/logo-w.svg', summary: 'Loud and confident, like a campaign poster. Black and orange, big photographs, heavy headlines.', home: ['hero', 'campaigns', 'tasks', 'stories', 'join', 'latest'] },
  { id: 'c', name: 'Community', logo: '/img/logo.svg', summary: 'Warm and friendly, like a local magazine. Cream paper, serif headlines, people first.', home: ['hero', 'stories', 'campaigns', 'tasks', 'latest', 'join'] },
];
const getDirection = (id) => DIRECTIONS.find((direction) => direction.id === id) ?? null;

const HERO_ARTICLE = 'kidical-mass-families-demand-safe-cycling-infrastructure';
const LIST_SIZE = 12;

const PRIMARY = [
  ['/campaigns', 'Campaigns'],
  ['/rides-and-events', 'Rides and events'],
  ['/guides', 'Information'],
  ['/stories', 'Stories'],
  ['/about', 'About'],
];

// What people come to do. Those without an address are ideas for the
// "information" side of the site and do not exist yet.
const TASKS = [
  { href: '/report', title: 'Report a problem', text: 'Potholes, blocked lanes, broken lights and near misses: who to tell and how.' },
  { href: '/cycle-tube-map', title: 'Find a route', text: 'The Portsmouth cycle tube map and rides we recommend.' },
  { href: '/how-to-respond-to-a-planning-application', title: 'Respond to a planning application', text: 'A step by step guide to having your say.' },
  { href: '/meetings', title: 'Come to a meeting', text: 'Open meetings are for everyone. See what was discussed.' },
  { title: 'Collision map', text: 'Where people cycling have been hurt in Portsmouth, from police data.' },
  { title: 'For drivers', text: 'Passing distances, junctions and what the Highway Code now says.' },
];

const SOCIALS = [
  ['https://www.facebook.com/PortsmouthCycleForum', 'Facebook'],
  ['https://www.instagram.com/pompey.bike', 'Instagram'],
  ['https://youtube.com/@PompeyBUG', 'YouTube'],
];

const isoDay = (date) => date.toISOString().slice(0, 10);
const shortFormat = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/London' });

// Keeps links inside the preview of one direction.
const linker = (direction) => (href) => `/design/${direction.id}${href === '/' ? '' : href}`;

// ---------- Layout ----------
function layout({ direction, title, here, main }) {
  const to = linker(direction);
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | Design ${direction.id.toUpperCase()}: ${direction.name}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/img/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/design.css">
<link rel="stylesheet" href="/css/design-${direction.id}.css">
</head>
<body>
  <a class="skip" href="#content">Skip to the content</a>
  <header class="top">
    <a class="brand" href="${to('/')}">
      <img src="${direction.logo}" alt="" width="78" height="43">
      <span>${SITE_NAME}</span>
    </a>
    <nav class="primary" aria-label="Site">
      <ul>
        ${PRIMARY.map(([href, label]) => html`<li><a href="${to(href)}" ${raw(here === href ? 'aria-current="page"' : '')}>${label}</a></li>`)}
        <li><a class="button" href="${to('/join')}">Join us</a></li>
      </ul>
    </nav>
  </header>
  ${main}
  <footer class="foot">
    <nav aria-label="Footer">
      <section>
        <h2>Read</h2>
        <ul>
          ${SECTIONS.map((section) => html`<li><a href="${to(`/${section.slug}`)}">${section.title}</a></li>`)}
        </ul>
      </section>
      <section>
        <h2>Find</h2>
        <ul>
          <li><a href="/tags">Topics</a></li>
          <li><a href="/archive">Archive: every article by year</a></li>
        </ul>
      </section>
      <section>
        <h2>Get involved</h2>
        <ul>
          <li><a href="${to('/join')}">Join us</a></li>
          <li><a href="${to('/support-us')}">Donate</a></li>
          <li><a href="${to('/help')}">Help us</a></li>
          <li><a href="${to('/contact')}">Contact</a></li>
        </ul>
      </section>
      <section>
        <h2>Follow</h2>
        <ul>
          ${SOCIALS.map(([href, label]) => html`<li><a href="${href}" rel="noopener me">${label}</a></li>`)}
        </ul>
      </section>
    </nav>
    <p>&copy; ${SITE_NAME} ${new Date().getFullYear()}. Volunteers maintain this site.</p>
    <p><a href="https://passionfruit.design">Hosted and supported by Passionfruit Design</a></p>
  </footer>
  <nav class="switcher" aria-label="Design previews">
    <p>Design preview</p>
    <ul>
      ${DIRECTIONS.map((other) => html`<li><a href="/design/${other.id}${here === '/' ? '' : here}" ${raw(other.id === direction.id ? 'aria-current="true"' : '')}>${other.id.toUpperCase()} ${other.name}</a></li>`)}
      <li><a href="/design">About these</a></li>
    </ul>
  </nav>
</body>
</html>`}
`;
}

// ---------- Pieces ----------
const thumb = (article, to, width = 600) =>
  html`<a class="thumb" href="${to(`/${article.slug}`)}" tabindex="-1" aria-hidden="true">
      ${article.cover ? html`<img src="${coverUrl(article, width)}" alt="" loading="lazy" decoding="async">` : html`<img class="empty" src="/img/logo-w.svg" alt="" loading="lazy">`}
    </a>`;

const feature = (article, to) =>
  html`<li>
      <article>
        ${thumb(article, to)}
        <p class="kicker">${getSection(article.section)?.title}</p>
        <h3><a href="${to(`/${article.slug}`)}">${article.title}</a></h3>
        ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
        <p>${article.description}</p>
      </article>
    </li>`;

const dated = (article, to) =>
  html`<li>
      <a href="${to(`/${article.slug}`)}">${article.title}</a>
      ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
    </li>`;

const band = (name, heading, more, body) =>
  html`<section class="band ${name}">
      <header>
        <h2>${heading}</h2>
        ${more && html`<a class="more" href="${more[0]}">${more[1]}</a>`}
      </header>
      ${body}
    </section>`;

// ---------- Home ----------
function homeParts(direction) {
  const to = linker(direction);
  const articles = content.listEntries('article');
  const hero = content.getEntry('article', HERO_ARTICLE);
  const campaigns = content.articlesInSection('campaigns').slice(0, 3);
  const stories = content.articlesInSection('stories').slice(0, 3);
  const first = articles.at(-1)?.date?.getUTCFullYear();

  return {
    hero: html`<section class="hero">
      <header>
        <p class="kicker">Portsmouth and Southsea</p>
        <h1>A city where anyone can cycle</h1>
        <p class="lede">We are the people who ride in Portsmouth, working with the council and each other for streets that are safe to cycle on.</p>
        <p class="actions">
          <a class="button" href="${to('/join')}">Join us</a>
          <a class="button quiet" href="${to('/report')}">Report a problem</a>
        </p>
      </header>
      ${hero?.cover && html`<figure><img src="${coverUrl(hero, 1200)}" alt="Families riding together through Portsmouth" fetchpriority="high"></figure>`}
    </section>`,

    tasks: band(
      'tasks',
      'What do you need?',
      [to('/guides'), 'All information'],
      html`<ul>
        ${TASKS.map((task) =>
          task.href
            ? html`<li><a href="${to(task.href)}"><strong>${task.title}</strong> <span>${task.text}</span></a></li>`
            : html`<li class="idea"><p><strong>${task.title}</strong> <span>${task.text}</span> <small>Idea, not built yet</small></p></li>`,
        )}
      </ul>`,
    ),

    campaigns: band('campaigns', 'What we are campaigning on', [to('/campaigns'), 'All campaigns'], html`<ul class="features">${campaigns.map((article) => feature(article, to))}</ul>`),

    stories: band('stories', 'People who ride here', [to('/stories'), 'More stories'], html`<ul class="features">${stories.map((article) => feature(article, to))}</ul>`),

    latest: band(
      'latest',
      'Latest',
      ['/archive', `Archive: all ${articles.length} articles since ${first}`],
      html`<ol class="dated">${articles.slice(0, 6).map((article) => dated(article, to))}</ol>`,
    ),

    join: html`<section class="join">
      <h2>More of us means a louder voice</h2>
      <p>Join the forum to hear about meetings, rides and consultations, and to add your name to the case for better cycling.</p>
      <p class="actions">
        <a class="button" href="${to('/join')}">Join us</a>
        <a class="button quiet" href="${to('/support-us')}">Donate</a>
      </p>
    </section>`,
  };
}

function renderHome(direction) {
  const parts = homeParts(direction);
  const main = html`<main id="content" class="home">${direction.home.map((name) => parts[name])}</main>`;
  return layout({ direction, title: SITE_NAME, here: '/', main });
}

// ---------- Section ----------
function renderSection(direction, section) {
  const to = linker(direction);
  const articles = content.articlesInSection(section.slug);
  const main = html`<main id="content" class="listing">
    <header class="page-head">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${to('/')}">Home</a></li></ol></nav>
      <h1>${section.title}</h1>
      <p class="lede">${section.intro}</p>
    </header>
    <ul class="features">${articles.slice(0, LIST_SIZE).map((article) => feature(article, to))}</ul>
    ${articles.length > LIST_SIZE && html`<p class="older"><a href="/${section.slug}?page=2">Older ${section.title.toLowerCase()}: ${articles.length - LIST_SIZE} more</a></p>`}
  </main>`;
  return layout({ direction, title: section.title, here: `/${section.slug}`, main });
}

// ---------- Article or page ----------
function renderEntry(direction, entry) {
  const to = linker(direction);
  const section = entry.kind === 'article' ? getSection(entry.section) : null;
  const related = entry.kind === 'article' ? content.relatedArticles(entry) : [];
  const main = html`<main id="content" class="entry">
    <article>
      <header class="page-head">
        <nav class="crumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="${to('/')}">Home</a></li>
            ${section && html`<li><a href="${to(`/${section.slug}`)}">${section.title}</a></li>`}
          </ol>
        </nav>
        <h1>${entry.title}</h1>
        ${entry.date && html`<p class="meta"><time datetime="${isoDay(entry.date)}">${formatDate(entry.date)}</time> <span>${entry.readingTime}</span></p>`}
      </header>
      ${entry.cover && html`<figure class="cover"><img src="${coverUrl(entry, 1200)}" alt="${entry.title}" fetchpriority="high"></figure>`}
      <section class="prose">${raw(entry.html)}</section>
    </article>
    ${section &&
    html`<aside class="filed" aria-label="Topics">
      <h2>Filed under</h2>
      <ul>
        <li><a href="${to(`/${section.slug}`)}">${section.title}</a></li>
        ${entry.tags.map((tag) => html`<li><a href="/tags/${content.tagSlug(tag)}">${content.toTitleCase(tag.replaceAll('-', ' '))}</a></li>`)}
      </ul>
    </aside>`}
    ${related.length > 0 &&
    html`<aside class="related" aria-label="Related articles">
      <h2>Related articles</h2>
      <ol class="dated">${related.map((article) => dated(article, to))}</ol>
    </aside>`}
  </main>`;
  return layout({ direction, title: entry.title, here: `/${entry.slug}`, main });
}

// ---------- Chooser ----------
function renderChooser() {
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Design previews | ${SITE_NAME}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/css/design.css">
</head>
<body class="chooser">
  <main>
    <h1>Three directions for the new look</h1>
    <p>Each one is the same pages and the same real content, dressed differently. The home page is a front door (what we do, what you can do here, current campaigns) and the old articles sit behind an archive link. Use the bar at the bottom of any preview to flip between the three on the same page.</p>
    <ul>
      ${DIRECTIONS.map(
        (direction) => html`<li>
        <article>
          <h2>${direction.id.toUpperCase()}: ${direction.name}</h2>
          <p>${direction.summary}</p>
          <ul>
            <li><a href="/design/${direction.id}">Home page</a></li>
            <li><a href="/design/${direction.id}/campaigns">Section page</a></li>
            <li><a href="/design/${direction.id}/2024-03-elm-grove">Article</a></li>
            <li><a href="/design/${direction.id}/about">About page</a></li>
          </ul>
        </article>
      </li>`,
      )}
    </ul>
    <p>Two boxes on the home page, "Collision map" and "For drivers", are marked as ideas. They are there to show where that kind of information would live; nothing is built behind them.</p>
    <p><a href="/">Back to the current site</a></p>
  </main>
</body>
</html>`}
`;
}

// ---------- Routes ----------
export function createPreviewRouter() {
  const router = Router();
  const send = (res, body) => res.set('Cache-Control', 'no-cache').set('X-Robots-Tag', 'noindex, nofollow').type('html').send(body);

  router.get('/', (req, res) => send(res, renderChooser()));

  router.param('direction', (req, res, next, id) => {
    req.direction = getDirection(id);
    return req.direction ? next() : next('route');
  });

  router.get('/:direction', (req, res) => send(res, renderHome(req.direction)));

  router.get('/:direction/*path', (req, res, next) => {
    const slug = req.params.path.join('/').toLowerCase();
    const section = getSection(slug);
    if (section) return send(res, renderSection(req.direction, section));
    const entry = content.getEntry('page', slug) ?? content.getEntry('article', slug);
    if (!entry || entry.draft) return next();
    return send(res, renderEntry(req.direction, entry));
  });

  return router;
}
