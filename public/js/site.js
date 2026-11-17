// Progressive enhancements for the public site. Every page works without
// this file; it adds the menu toggle, live search and endless scrolling.

const SEARCH_DELAY_MS = 300;
const UPTICKS_BEFORE_STICKY = 50;

// ---------- Menu ----------
const navMenu = document.querySelector('#navmenu');
const menuToggle = document.querySelector('#navmenuToggle');
const menuClose = document.querySelector('#navmenu .close-button');

function toggleMenu() {
  const hidden = navMenu.classList.toggle('navmenu-hidden');
  document.body.classList.toggle('disable-overflow', !hidden);
  menuToggle.setAttribute('aria-expanded', String(!hidden));
}

menuToggle?.addEventListener('click', toggleMenu);
menuClose?.addEventListener('click', toggleMenu);

// ---------- Header reappears when scrolling back up ----------
const siteHeader = document.querySelector('.site-header');
let upticks = 0;
let lastScroll = 0;

function trackScroll() {
  const top = Math.max(0, document.documentElement.scrollTop);
  if (top < lastScroll) {
    upticks += 1;
    if (upticks > UPTICKS_BEFORE_STICKY) siteHeader.classList.add('header-sticky');
  } else {
    siteHeader.classList.remove('header-sticky');
    upticks = 0;
  }
  lastScroll = top;
}

if (siteHeader) document.addEventListener('scroll', trackScroll, { passive: true });

// ---------- Article search and endless scrolling ----------
const cards = document.querySelector('ul.cards');
const searchForm = document.querySelector('search form');
const searchInput = document.querySelector('#search');
const cardTemplate = document.querySelector('#card-template');
const tagTemplate = document.querySelector('#card-tag-template');
const results = document.querySelector('#results');
const end = document.querySelector('#end');
const pager = document.querySelector('.pager');

const listing = { query: '', page: 1, pages: 1, loading: false, request: 0 };
let searchTimer;

function buildTag(tag) {
  const item = tagTemplate.content.cloneNode(true);
  const link = item.querySelector('a');
  link.href = tag.url;
  link.textContent = tag.label;
  return item;
}

function buildCard(data) {
  const card = cardTemplate.content.cloneNode(true);
  const imageLink = card.querySelector('.card-image');
  const cover = card.querySelector('.card-cover');
  const titleLink = card.querySelector('h2 a');
  const time = card.querySelector('time');

  imageLink.href = data.url;
  imageLink.dataset.align = data.align;
  cover.hidden = !data.cover;
  if (data.cover) cover.src = data.cover;
  else cover.removeAttribute('src');
  card.querySelector('.card-placeholder').hidden = Boolean(data.cover);
  titleLink.href = data.url;
  titleLink.textContent = data.title;
  time.dateTime = data.isoDate;
  time.textContent = data.date;
  card.querySelector('.card-description').textContent = data.description;
  card.querySelector('.card-tags').append(...data.tags.map(buildTag));
  return card;
}

async function loadCards({ replace }) {
  const request = ++listing.request;
  const page = replace ? 1 : listing.page + 1;
  listing.loading = true;
  try {
    const response = await fetch(`/api/articles?${new URLSearchParams({ q: listing.query, page, section: cards.dataset.section ?? '' })}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // A newer search has started; this answer is out of date.
    if (request !== listing.request) return;

    const built = data.items.map(buildCard);
    if (replace) cards.replaceChildren(...built);
    else cards.append(...built);
    listing.page = data.page;
    listing.pages = data.pages;
    results.hidden = listing.query.length === 0;
    results.textContent = `Results: ${data.total}`;
    end.hidden = listing.page < listing.pages;
  } catch (error) {
    console.error('Could not load articles', error);
  } finally {
    if (request === listing.request) listing.loading = false;
  }
}

function runSearch() {
  listing.query = searchInput.value.trim();
  const url = new URL(window.location.href);
  if (listing.query) url.searchParams.set('q', listing.query);
  else url.searchParams.delete('q');
  url.searchParams.delete('page');
  window.history.replaceState(null, '', url);
  loadCards({ replace: true });
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, SEARCH_DELAY_MS);
}

function submitSearch(event) {
  event.preventDefault();
  clearTimeout(searchTimer);
  runSearch();
}

function loadMoreWhenVisible(entries) {
  const visible = entries.some((entry) => entry.isIntersecting);
  if (visible && !listing.loading && listing.page < listing.pages) loadCards({ replace: false });
}

if (cards && searchInput && cardTemplate) {
  listing.query = searchInput.value.trim();
  listing.page = Number(cards.dataset.page) || 1;
  listing.pages = Math.max(1, Math.ceil(Number(cards.dataset.total) / 16));
  searchInput.addEventListener('input', scheduleSearch);
  searchForm.addEventListener('submit', submitSearch);
  // The pager links stay in the page for visitors without JavaScript; here
  // they become the marker that triggers loading the next batch.
  pager.dataset.enhanced = 'true';
  new IntersectionObserver(loadMoreWhenVisible, { rootMargin: '600px' }).observe(pager);
}

// ---------- Tag filter ----------
const tagFilter = document.querySelector('#tag-filter');

function filterTags() {
  const wanted = tagFilter.value.trim().toLowerCase();
  document.querySelectorAll('#tag-list li').forEach((item) => {
    item.hidden = !item.textContent.toLowerCase().includes(wanted);
  });
}

tagFilter?.addEventListener('input', filterTags);

// ---------- HubSpot sign-up form ----------
const hubspotForm = document.querySelector('.hubspot-form');

function createHubspotForm() {
  const { region, portal, form } = hubspotForm.dataset;
  window.hbspt.forms.create({ region, portalId: portal, formId: form, target: '.hubspot-form' });
}

if (hubspotForm) {
  const script = document.createElement('script');
  script.src = `https://js-${hubspotForm.dataset.region}.hsforms.net/forms/embed/v2.js`;
  script.addEventListener('load', createHubspotForm);
  document.head.append(script);
}
