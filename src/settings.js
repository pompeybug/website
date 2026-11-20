// Site settings that editors can change: the menus and the home page. Each
// is one JSON file in the "settings" folder of the content repository, so a
// change is committed and backed up exactly as an article is.
//
// A menu item never stores an address. It stores what it points at (a page,
// an article, a section...) and resolveLink() works out the address when the
// page is drawn, so a page whose address changes keeps its place in the menu.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import slugify from '@sindresorhus/slugify';
import * as content from './content.js';
import { SECTIONS, getSection } from './taxonomy.js';

const FOLDER = 'settings';
const MAX_TOP = 8;
const MAX_CHILDREN = 10;
const MAX_TASKS = 6;
const LABEL_LENGTH = 60;
const HERO_ARTICLE = 'kidical-mass-families-demand-safe-cycling-infrastructure';

// Pages of the site that are neither an article, a page nor a section.
const SITE_PAGES = [
  { target: 'home', title: 'Home', href: '/' },
  { target: 'articles', title: 'Latest articles and search', href: '/articles' },
  { target: 'topics', title: 'Topics', href: '/tags' },
  { target: 'archive', title: 'Archive: every article by year', href: '/archive' },
];

const page = (target) => ({ type: 'page', target });
const section = (target) => ({ type: 'section', target });
const site = (target) => ({ type: 'site', target });
const url = (target) => ({ type: 'url', target });
const item = (label, link, children = []) => ({ label, link, children });

const DEFAULTS = {
  menu: {
    primary: [
      item('', section('campaigns')),
      item('', section('rides-and-events')),
      item('Information', section('guides'), [item('Report a problem', { type: 'article', target: 'report' }), item('Infrastructure', page('infrastructure')), item('', section('meetings'))]),
      item('Stories', section('stories')),
      item('About', page('about'), [item('', page('about')), item('', section('news')), item('', page('contact')), item('', page('help')), item('Donate', page('support-us'))]),
      item('Search', site('articles')),
    ],
    footer: [
      item('Read', null, SECTIONS.map((entry) => item('', section(entry.slug)))),
      item('Find', null, [item('Search articles', site('articles')), item('', site('topics')), item('', site('archive'))]),
      item('Get involved', null, [item('Join us', page('join')), item('Donate', page('support-us')), item('Help us', page('help')), item('Contact', page('contact'))]),
      item('Follow', null, [
        item('Facebook', url('https://www.facebook.com/PortsmouthCycleForum')),
        item('Instagram', url('https://www.instagram.com/pompey.bike')),
        item('YouTube', url('https://youtube.com/@PompeyBUG')),
      ]),
    ],
  },
  home: {
    kicker: 'Portsmouth and Southsea',
    headline: 'A city where anyone can walk, wheel or cycle',
    intro: 'We speak up for every kind of active travel in Portsmouth, working with the council and each other for streets that are safe on foot, on wheels and by bike.',
    heroImage: '',
    heroAlt: 'Families riding together through Portsmouth',
    tasksHeading: 'What do you need?',
    tasks: [
      { title: 'Report a problem', text: 'Potholes, blocked lanes, broken lights and near misses: who to tell and how.', link: { type: 'article', target: 'report' } },
      { title: 'Find a route', text: 'The Portsmouth cycle tube map and rides we recommend.', link: { type: 'article', target: 'cycle-tube-map' } },
      { title: 'Respond to a planning application', text: 'A step by step guide to having your say.', link: { type: 'article', target: 'how-to-respond-to-a-planning-application' } },
      { title: 'Come to a meeting', text: 'Open meetings are for everyone. See what was discussed.', link: section('meetings') },
      { title: 'Collision map', text: 'Coming soon: where people walking and cycling have been hurt on Portsmouth roads.', link: page('collision-map') },
      { title: 'For drivers', text: 'Coming soon: what the Highway Code asks of drivers around people on bikes and on foot.', link: page('for-drivers') },
    ],
    joinHeading: 'More of us means a louder voice',
    joinText: 'Join the forum to hear about meetings, rides and consultations, and to add your name to the case for safer streets.',
    showLatest: true,
  },
};

const stamp = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const fileFor = (name) => path.join(content.contentDir, FOLDER, `${name}.json`);

// name -> { data, revision }
const loaded = new Map();

async function load() {
  for (const name of Object.keys(DEFAULTS)) {
    let data = DEFAULTS[name];
    try {
      if (existsSync(fileFor(name))) data = { ...DEFAULTS[name], ...JSON.parse(await readFile(fileFor(name), 'utf8')) };
    } catch (error) {
      console.error(`Using the built-in ${name} settings: ${error.message}`);
    }
    loaded.set(name, { data, revision: stamp(JSON.stringify(data)) });
  }
}

export async function init() {
  await load();
  content.onReload(load);
}

export const has = (name) => Object.hasOwn(DEFAULTS, name);
export const get = (name) => loaded.get(name).data;
export const revision = (name) => loaded.get(name).revision;

// ---------- Links ----------
// The one place that turns "what a link points at" into an address and a
// name. Returns null when the target has gone, and the link is then left out.
export function resolveLink(link) {
  if (!link?.type) return null;
  const target = String(link.target ?? '');
  if (link.type === 'url') return /^(https?:\/\/|mailto:)\S+$/i.test(target) ? { href: target, title: target.replace(/^(https?:\/\/|mailto:)/i, ''), outside: true } : null;
  if (link.type === 'site') {
    const found = SITE_PAGES.find((entry) => entry.target === target);
    return found ? { href: found.href, title: found.title } : null;
  }
  if (link.type === 'section') {
    const found = getSection(target);
    return found ? { href: `/${found.slug}`, title: found.title } : null;
  }
  if (link.type === 'page' || link.type === 'article') {
    const entry = content.getEntry(link.type, target);
    return entry && !entry.draft ? { href: content.entryUrl(entry), title: entry.title } : null;
  }
  return null;
}

// Everything a menu item or home page box can point at, for the editor.
export function linkChoices() {
  const option = (type, target, label) => ({ value: `${type}:${target}`, label });
  return {
    groups: [
      { label: 'Sections', options: SECTIONS.map((entry) => option('section', entry.slug, entry.title)) },
      { label: 'Pages', options: content.listEntries('page').filter((entry) => entry.slug !== '404').map((entry) => option('page', entry.slug, entry.title)) },
      { label: 'Other parts of the site', options: SITE_PAGES.map((entry) => option('site', entry.target, entry.title)) },
    ],
    articles: content.listEntries('article').map((entry) => ({ slug: entry.slug, title: entry.title })),
  };
}

function resolveItem(entry) {
  const link = resolveLink(entry.link);
  const children = (entry.children ?? []).map(resolveItem).filter((child) => child?.href);
  const label = entry.label || link?.title || '';
  if (!label || (!link && children.length === 0)) return null;
  return { label, href: link?.href ?? null, outside: link?.outside === true, children };
}

// The menus as the templates need them: names and addresses, broken links gone.
export function resolvedMenu(menu = get('menu')) {
  // "index" is an item's place in the stored menu, which the editor's preview
  // uses to find it once items with broken links have been left out.
  const primary = menu.primary.map((entry, index) => ({ ...resolveItem(entry), index })).filter((entry) => entry.href);
  return { primary, footer: menu.footer.map(resolveItem).filter(Boolean) };
}

const featuredFirst = (a, b) => Number(b.featured) - Number(a.featured);

// The home page with its links resolved and its articles chosen. Articles an
// editor has ticked "feature on the home page" come first, then the newest.
export function resolvedHome(home = get('home')) {
  const hero = content.getEntry('article', HERO_ARTICLE);
  const pick = (slug) => content.articlesInSection(slug).toSorted(featuredFirst).slice(0, 3);
  return {
    ...home,
    heroImage: home.heroImage || hero?.cover || '',
    tasks: home.tasks.map((task) => ({ ...task, href: resolveLink(task.link)?.href })).filter((task) => task.href),
    campaigns: pick('campaigns'),
    stories: pick('stories'),
  };
}

// ---------- Saving ----------
const text = (value, length) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, length);

// Each cleaner is strict when saving and forgiving when drawing a preview of
// half-finished work: where a save would be refused, a preview leaves the
// unfinished part out.
function refuse(strict, message) {
  if (strict) throw new content.ContentError(message);
}

function cleanLink(link, { required, strict }) {
  if (!link?.type) {
    if (required) refuse(strict, 'Every item needs something to link to.');
    return null;
  }
  const clean = { type: String(link.type), target: String(link.target ?? '').trim() };
  if (!resolveLink(clean)) {
    if (!strict) return null;
    throw new content.ContentError(clean.type === 'url' ? `“${clean.target}” is not a full web address. It should start with https://` : 'One of the links points at something that is not on the site, or is still a draft. Choose it again.');
  }
  return clean;
}

function cleanItem(entry, { depth, linkRequired, strict }) {
  const children = depth === 0 ? (Array.isArray(entry?.children) ? entry.children : []).slice(0, MAX_CHILDREN).map((child) => cleanItem(child, { depth: 1, linkRequired: true, strict })) : [];
  const label = text(entry?.label, LABEL_LENGTH);
  const link = cleanLink(entry?.link, { required: linkRequired, strict });
  if (!label && link?.type === 'url') refuse(strict, 'A link to another website needs a name.');
  if (!label && !link) refuse(strict, 'Each group of footer links needs a heading.');
  return { label, link, children };
}

const CLEANERS = {
  menu: (data, strict) => ({
    primary: (Array.isArray(data?.primary) ? data.primary : []).slice(0, MAX_TOP).map((entry) => cleanItem(entry, { depth: 0, linkRequired: true, strict })),
    footer: (Array.isArray(data?.footer) ? data.footer : []).slice(0, MAX_TOP).map((entry) => cleanItem(entry, { depth: 0, linkRequired: false, strict })),
  }),
  home(data, strict) {
    const headline = text(data?.headline, 120);
    if (!headline) refuse(strict, 'The home page needs a headline.');
    const heroImage = String(data?.heroImage ?? '');
    return {
      kicker: text(data?.kicker, 60),
      headline,
      intro: text(data?.intro, 400),
      // Only a picture already on this site can be used.
      heroImage: /^\/(media|assets)\/[^\s?#]+$/.test(heroImage) ? heroImage : '',
      heroAlt: text(data?.heroAlt, 200),
      tasksHeading: text(data?.tasksHeading, 60) || DEFAULTS.home.tasksHeading,
      tasks: (Array.isArray(data?.tasks) ? data.tasks : []).slice(0, MAX_TASKS).map((task) => {
        const title = text(task?.title, LABEL_LENGTH);
        if (!title) refuse(strict, 'Each box needs a title.');
        return { title, text: text(task?.text, 160), link: cleanLink(task?.link, { required: true, strict }) };
      }),
      joinHeading: text(data?.joinHeading, 80) || DEFAULTS.home.joinHeading,
      joinText: text(data?.joinText, 300),
      showLatest: data?.showLatest !== false,
    };
  },
};

// Unsaved settings from the editor, made safe to draw as a preview.
export const draft = (name, data) => CLEANERS[name](data, false);

const NAMES = { menu: 'the menus', home: 'the home page' };

async function writeAtomic(file, body) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, body);
  await rename(tmp, file);
}

export async function save(name, data, basedOn, editor) {
  if (basedOn !== revision(name)) {
    throw new content.ContentError('Someone else has changed this since you opened it. Reload the page and make your changes again.', 412);
  }
  const clean = CLEANERS[name](data, true);
  await writeAtomic(fileFor(name), `${JSON.stringify(clean, null, 2)}\n`);
  loaded.set(name, { data: clean, revision: stamp(JSON.stringify(clean)) });
  await content.commit(`Update ${NAMES[name]}`, editor);
  return clean;
}

// A picture for the home page, kept beside the settings.
export async function addImage({ originalName, buffer, extension }, editor) {
  const folder = path.join(content.contentDir, FOLDER);
  await mkdir(folder, { recursive: true });
  const base = slugify(path.basename(originalName, path.extname(originalName))) || 'image';
  let name = `${base}.${extension}`;
  for (let n = 2; existsSync(path.join(folder, name)); n += 1) name = `${base}-${n}.${extension}`;
  await writeFile(path.join(folder, name), buffer);
  await content.commit(`Add home page picture: ${name}`, editor);
  return { name, url: `/media/${FOLDER}/${name}` };
}
