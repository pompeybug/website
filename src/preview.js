// Design preview. The chosen look ("Campaign": black and orange, big
// photographs, heavy headlines) shown on a "front door" home page, a section
// page and any article or page, using the real content. Lives under
// /design/b and is never indexed. Once it is agreed, its templates and
// stylesheet replace render.js and site.css, and this file goes.

import { statSync } from 'node:fs';
import { Router } from 'express';
import { html, raw } from './html.js';
import * as content from './content.js';
import { SITE_NAME, coverUrl, formatDate } from './render.js';
import { SECTIONS, getSection } from './taxonomy.js';

const BASE = '/design/b';
// Stylesheets are cached for a week, so the address changes when the file does.
const CSS_VERSION = Math.round(statSync(new URL('../public/css/design.css', import.meta.url)).mtimeMs).toString(36);
const JS_VERSION = Math.round(statSync(new URL('../public/js/design.js', import.meta.url)).mtimeMs).toString(36);
const HOME = ['hero', 'campaigns', 'tasks', 'stories', 'join', 'latest'];

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

// Keeps links inside the preview.
const to = (href) => `${BASE}${href === '/' ? '' : href}`;

// ---------- Layout ----------
function layout({ title, here, main }) {
  return `<!doctype html>
${html`<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | Design preview</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/img/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/design.css?v=${CSS_VERSION}">
<script type="module" src="/js/design.js?v=${JS_VERSION}"></script>
</head>
<body>
  <a class="skip" href="#content">Skip to the content</a>
  <header class="top">
    <a class="brand" href="${to('/')}">
      <img src="/img/logo.svg" alt="" width="78" height="43">
      <span>${SITE_NAME}</span>
    </a>
    <button type="button" class="menu-toggle" id="site-menu-toggle" aria-controls="site-menu" aria-expanded="false" hidden>Menu</button>
    <a class="button" href="${to('/join')}">Join us</a>
    <nav class="primary" id="site-menu" aria-label="Site">
      <ul>
        ${PRIMARY.map(([href, label]) => html`<li><a href="${to(href)}" ${raw(here === href ? 'aria-current="page"' : '')}>${label}</a></li>`)}
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
  <aside class="switcher" aria-label="Design preview">
    <p>Design preview</p>
    <a href="/">Back to the current site</a>
  </aside>
</body>
</html>`}
`;
}

// ---------- Pieces ----------
const thumb = (article, width = 600) =>
  html`<figure class="thumb">
      ${article.cover ? html`<img src="${coverUrl(article, width)}" alt="" loading="lazy" decoding="async">` : html`<img class="empty" src="/img/logo-w.svg" alt="" loading="lazy">`}
    </figure>`;

const feature = (article) =>
  html`<li>
      <article>
        ${thumb(article)}
        <p class="kicker">${getSection(article.section)?.title}</p>
        <h3><a href="${to(`/${article.slug}`)}">${article.title}</a></h3>
        ${article.date && html`<time datetime="${isoDay(article.date)}">${shortFormat.format(article.date)}</time>`}
      </article>
    </li>`;

const dated = (article) =>
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
function homeParts() {
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

    campaigns: band('campaigns', 'What we are campaigning on', [to('/campaigns'), 'All campaigns'], html`<ul class="features">${campaigns.map((article) => feature(article))}</ul>`),

    stories: band('stories', 'People who ride here', [to('/stories'), 'More stories'], html`<ul class="features">${stories.map((article) => feature(article))}</ul>`),

    latest: band(
      'latest',
      'Latest',
      ['/archive', `Archive: all ${articles.length} articles since ${first}`],
      html`<ol class="dated">${articles.slice(0, 6).map((article) => dated(article))}</ol>`,
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

function renderHome() {
  const parts = homeParts();
  const main = html`<main id="content" class="home">${HOME.map((name) => parts[name])}</main>`;
  return layout({ title: SITE_NAME, here: '/', main });
}

// ---------- Section ----------
function renderSection(section) {
  const articles = content.articlesInSection(section.slug);
  const main = html`<main id="content" class="listing">
    <header class="page-head">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${to('/')}">Home</a></li></ol></nav>
      <h1>${section.title}</h1>
      <p class="lede">${section.intro}</p>
    </header>
    <ul class="features">${articles.slice(0, LIST_SIZE).map((article) => feature(article))}</ul>
    ${articles.length > LIST_SIZE && html`<p class="older"><a href="/${section.slug}?page=2">Older ${section.title.toLowerCase()}: ${articles.length - LIST_SIZE} more</a></p>`}
  </main>`;
  return layout({ title: section.title, here: `/${section.slug}`, main });
}

// ---------- Article or page ----------
function renderEntry(entry) {
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
      ${section &&
      html`<footer>
        <nav class="filed" aria-label="Topics">
          <h2>Filed under</h2>
          <ul>
            <li><a href="${to(`/${section.slug}`)}">${section.title}</a></li>
            ${entry.tags.map((tag) => html`<li><a href="/tags/${content.tagSlug(tag)}">${content.toTitleCase(tag.replaceAll('-', ' '))}</a></li>`)}
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
  return layout({ title: entry.title, here: `/${entry.slug}`, main });
}

// ---------- Routes ----------
export function createPreviewRouter() {
  const router = Router();
  const send = (res, body) => res.set('Cache-Control', 'no-cache').set('X-Robots-Tag', 'noindex, nofollow').type('html').send(body);

  router.get('/', (req, res) => res.redirect(BASE));
  router.get('/b', (req, res) => send(res, renderHome()));

  router.get('/b/*path', (req, res, next) => {
    const slug = req.params.path.join('/').toLowerCase();
    const section = getSection(slug);
    if (section) return send(res, renderSection(section));
    const entry = content.getEntry('page', slug) ?? content.getEntry('article', slug);
    if (!entry || entry.draft) return next();
    return send(res, renderEntry(entry));
  });

  return router;
}
