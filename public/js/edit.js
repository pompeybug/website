// The editor at /edit. One page with a pane for each job (sign in, list,
// editor, home page, menus, people),
// each with its own address so it can be bookmarked or sent to someone:
//   /edit                 articles      /edit/pages          pages
//   /edit/article/<slug>  one article   /edit/page/<slug>    one page
//   /edit/home            the home page /edit/menu           the menus
//   /edit/people          who can edit (site owners only)
// The article, home page and menu panes each have a preview beside them,
// drawn by the server from what is on screen, saved or not.

const API = '/edit/api';
const PREVIEW_DELAY_MS = 700;
const SEARCH_DELAY_MS = 250;
const MAX_TASKS = 6;
const MAX_MENU_ITEMS = 8;
const UNSAVED = 'You have changes that are not saved yet.';
const COLLECTIONS = { article: 'articles', page: 'pages' };
const WORDS = {
  article: { list: 'Articles', add: 'Write a new article', heading: 'New article' },
  page: { list: 'Pages', add: 'Add a new page', heading: 'New page' },
};
const SIGN_IN_ERRORS = {
  denied: 'That Google account has not been added as an editor. Ask the site owner to add it, then try again.',
  auth: 'Signing in did not finish. Please try again.',
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const clone = (id) => $(`#${id}`).content.cloneNode(true);

const panes = { signIn: $('#sign-in'), list: $('#list'), editor: $('#editor'), home: $('#home'), menu: $('#menu'), people: $('#people') };
const form = $('#entry-form');
const previewForm = $('#preview-form');
const settingsPreviewForm = $('#settings-preview-form');
const bodyField = $('#field-body');
const statusLine = $('[data-status]');
const tagInput = $('#tag-input');

const state = {
  editor: null,
  kind: 'article',
  slug: null,
  etag: null,
  tags: [],
  coverImage: '',
  coverUrl: '',
  pictures: [],
  dirty: false,
  // The menus or the home page, whichever is open.
  settingsEtag: null,
  heroImage: '',
};
let linkChoices = null;
let previewTimer;
let searchTimer;

// ---------- Talking to the server ----------
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body && !isForm ? JSON.stringify(body) : body,
  });
  if (response.status === 401) {
    showSignIn();
    throw new ApiError('Please sign in again.', 401);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', response.status);
  return { data, etag: response.headers.get('ETag') };
}

const entryPath = (kind, slug) => `/${COLLECTIONS[kind]}/${encodeURIComponent(slug)}`;

// ---------- Panes ----------
function show(pane) {
  $('[data-loading]').hidden = true;
  Object.values(panes).forEach((section) => {
    section.hidden = section !== pane;
  });
}

function setStatus(text, tone = '') {
  statusLine.textContent = text;
  statusLine.dataset.tone = tone;
}

function showSignIn() {
  const error = new URLSearchParams(window.location.search).get('error');
  const errorLine = $('[data-sign-in-error]');
  errorLine.hidden = !SIGN_IN_ERRORS[error];
  errorLine.textContent = SIGN_IN_ERRORS[error] ?? '';
  $('.bar nav').hidden = true;
  $('.who').hidden = true;
  show(panes.signIn);
}

function markCurrentLink(pane) {
  $$('.bar nav a[data-pane]').forEach((link) => {
    if (link.dataset.pane === pane) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// ---------- Previews ----------
// A preview is a frame showing the real page at the width of a phone or a
// computer, shrunk to fit the space beside the form.
const PREVIEW_WIDTHS = { phone: 390, computer: 1280 };
const SIZE_KEY = 'pcf-editor-preview-size';
const WIDE_SCREEN = '(width > 70rem)';
const previews = new Map();

function startingSize() {
  try {
    const saved = window.localStorage.getItem(SIZE_KEY);
    if (PREVIEW_WIDTHS[saved]) return saved;
  } catch {
    // The browser is not keeping settings; use the default.
  }
  return window.matchMedia(WIDE_SCREEN).matches ? 'computer' : 'phone';
}

function fitPreview(preview) {
  const width = PREVIEW_WIDTHS[preview.size];
  const room = preview.screen.clientWidth;
  if (!room) return;
  preview.screen.style.setProperty('--frame-width', `${width}px`);
  preview.screen.style.setProperty('--frame-scale', Math.min(1, room / width).toFixed(4));
}

const previewWatcher = new ResizeObserver((changes) => {
  changes.forEach((change) => fitPreview([...previews.values()].find((preview) => preview.screen === change.target)));
});

function setPreviewSize(size) {
  previews.forEach((preview) => {
    preview.size = size;
    $$('[data-size]', preview.aside).forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.size === size)));
    fitPreview(preview);
  });
}

function handleSizeClick(event) {
  const button = event.target.closest('[data-size]');
  if (!button) return;
  setPreviewSize(button.dataset.size);
  try {
    window.localStorage.setItem(SIZE_KEY, button.dataset.size);
  } catch {
    // Not remembered for next time; nothing else is lost.
  }
}

function frameDocument(preview) {
  try {
    return preview.frame.contentDocument;
  } catch {
    // The frame is showing something this page may not script.
    return null;
  }
}

// Shows, in the preview, the part of the page being worked on: scrolls to it
// and, for the top menu, opens the menu and the drop-down of the item in hand.
function spotlight(preview, { scroll }) {
  const page = frameDocument(preview);
  if (!page || !preview.focus) return;
  const { selector, opensMenu, row } = preview.focus;
  const siteMenu = page.querySelector('#site-menu');
  if (opensMenu && siteMenu) {
    siteMenu.classList.add('open');
    page.querySelector('#site-menu-toggle')?.setAttribute('aria-expanded', 'true');
    $$('li.show', siteMenu).forEach((item) => item.classList.remove('show'));
    if (row?.isConnected) siteMenu.querySelector(`li[data-item="${[...row.parentElement.children].indexOf(row)}"]`)?.classList.add('show');
  }
  if (scroll) page.querySelector(selector)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function handlePreviewLoad(preview) {
  try {
    preview.frame.contentWindow.scrollTo(0, preview.scroll);
  } catch {
    // Nothing to restore.
  }
  spotlight(preview, { scroll: false });
}

// Sends a hidden form into the preview's frame, keeping its place on the page.
function postPreview(preview, hiddenForm) {
  try {
    preview.scroll = preview.frame.contentWindow.scrollY;
  } catch {
    preview.scroll = 0;
  }
  hiddenForm.target = preview.frame.name;
  hiddenForm.submit();
}

function buildPreview(aside) {
  const parts = clone('preview');
  const frame = $('iframe', parts);
  frame.name = `${aside.dataset.preview}-preview-frame`;
  const preview = { aside, frame, screen: $('.screen', parts), size: 'computer', scroll: 0, focus: null };
  aside.append(parts);
  previews.set(aside.dataset.preview, preview);
  frame.addEventListener('load', () => handlePreviewLoad(preview));
  aside.addEventListener('click', handleSizeClick);
  previewWatcher.observe(preview.screen);
}

// ---------- List ----------
function buildRow(entry) {
  const row = clone('entry-row');
  const link = $('a', row);
  link.href = `/edit/${entry.kind}/${entry.slug}`;
  $('[data-title]', row).textContent = entry.title;
  $('[data-draft]', row).hidden = !entry.draft;
  $('[data-featured]', row).hidden = !entry.featured;
  $('[data-notes]', row).hidden = entry.notes === 0;
  const time = $('[data-date]', row);
  time.dateTime = entry.date;
  time.textContent = entry.dateLabel;
  return row;
}

async function loadList() {
  const query = $('#list-search').value.trim();
  const { data } = await request(`/${COLLECTIONS[state.kind]}?${new URLSearchParams({ q: query })}`);
  $('.entries', panes.list).replaceChildren(...data.map(buildRow));
  $('[data-list-count]').textContent = query ? `${data.length} found` : `${data.length} in total`;
}

function scheduleListSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadList, SEARCH_DELAY_MS);
}

async function showList(kind) {
  state.kind = kind;
  state.slug = null;
  $('#list-heading').textContent = WORDS[kind].list;
  $('[data-action="new"]').textContent = WORDS[kind].add;
  $('#list-search').value = '';
  $('search', panes.list).hidden = kind === 'page';
  markCurrentLink(COLLECTIONS[kind]);
  show(panes.list);
  await loadList();
}

// ---------- Tags ----------
function buildChip(tag) {
  const chip = clone('chip');
  $('[data-label]', chip).textContent = tag;
  $('[data-remove]', chip).dataset.tag = tag;
  return chip;
}

function drawTags() {
  $('[data-tags]').replaceChildren(...state.tags.map(buildChip));
}

function addTag(raw) {
  const tag = raw.trim().replace(/,+$/, '').trim();
  if (tag && !state.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
    state.tags = [...state.tags, tag];
    drawTags();
    markDirty();
  }
  tagInput.value = '';
}

function handleTagKey(event) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    addTag(tagInput.value);
  }
}

function handleTagBlur() {
  if (tagInput.value.trim()) addTag(tagInput.value);
}

function handleChipClick(event) {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  state.tags = state.tags.filter((tag) => tag !== button.dataset.tag);
  drawTags();
  markDirty();
}

// ---------- Pictures ----------
function buildPicture(picture) {
  const item = clone('picture');
  const isCover = picture.source === state.coverImage;
  $('img', item).src = `${picture.url}?w=320`;
  $('[data-name]', item).textContent = picture.name;
  $('[data-cover-mark]', item).hidden = !isCover;
  const insert = $('[data-insert]', item);
  insert.dataset.source = picture.source;
  insert.hidden = picture.external === true;
  const cover = $('[data-cover]', item);
  cover.dataset.source = picture.source;
  cover.textContent = isCover ? 'Remove from the top' : 'Use at the top';
  return item;
}

function drawPictures() {
  const known = state.pictures.some((picture) => picture.source === state.coverImage);
  // A top picture set on the old site may live outside this page's own folder.
  const legacy = state.coverImage && !known ? [{ name: 'Current top picture', source: state.coverImage, url: state.coverUrl.split('?')[0], external: true }] : [];
  $('[data-pictures]').replaceChildren(...[...legacy, ...state.pictures].map(buildPicture));
  $$('[data-cover-only]').forEach((element) => {
    element.hidden = !state.coverImage;
  });
}

function insertAtCursor(text) {
  const start = bodyField.selectionStart;
  const before = bodyField.value.slice(0, start);
  const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  bodyField.setRangeText(`${lead}${text}\n\n`, start, bodyField.selectionEnd, 'end');
  bodyField.focus();
  markDirty();
}

function handlePictureClick(event) {
  const insert = event.target.closest('[data-insert]');
  const cover = event.target.closest('[data-cover]');
  if (insert) insertAtCursor(`![Describe this picture](${insert.dataset.source})`);
  if (cover) {
    state.coverImage = state.coverImage === cover.dataset.source ? '' : cover.dataset.source;
    drawPictures();
    markDirty();
  }
}

function choosePicture() {
  $('[data-file]').click();
}

async function uploadPicture(event) {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  const uploadStatus = $('[data-upload-status]');
  uploadStatus.textContent = 'Uploading…';
  const body = new FormData();
  body.append('image', file);
  try {
    const { data } = await request(`${entryPath(state.kind, state.slug)}/images`, { method: 'POST', body });
    state.pictures = [...state.pictures, data];
    drawPictures();
    uploadStatus.textContent = `Uploaded ${data.name}. Now add it to the text or use it at the top.`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
}

// ---------- Formatting buttons ----------
function wrapSelection(before, after, placeholder) {
  const { selectionStart: start, selectionEnd: end, value } = bodyField;
  const chosen = value.slice(start, end) || placeholder;
  bodyField.setRangeText(`${before}${chosen}${after}`, start, end, 'select');
  bodyField.setSelectionRange(start + before.length, start + before.length + chosen.length);
  bodyField.focus();
  markDirty();
}

function prefixLines(prefix) {
  const { selectionStart: start, selectionEnd: end, value } = bodyField;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const block = value.slice(lineStart, end) || 'Text';
  const prefixed = block
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  bodyField.setRangeText(prefixed, lineStart, end, 'end');
  bodyField.focus();
  markDirty();
}

function ask({ heading, text = '', label = '', ok = 'OK', input = true }) {
  const dialog = $('#ask-dialog');
  const field = $('#ask-input');
  $('#ask-heading').textContent = heading;
  $('[data-ask-text]').textContent = text;
  $('[data-ask-text]').hidden = !text;
  $('[data-ask-label]').textContent = label;
  $('[data-ask-label]').hidden = !input;
  $('[data-ask-ok]').textContent = ok;
  field.hidden = !input;
  field.value = '';
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok' ? (input ? field.value.trim() : true) : null), { once: true });
  });
}

const FORMATS = {
  bold: () => wrapSelection('**', '**', 'bold text'),
  italic: () => wrapSelection('*', '*', 'italic text'),
  heading: () => prefixLines('## '),
  list: () => prefixLines('- '),
  quote: () => prefixLines('> '),
  image: choosePicture,
  async link() {
    const address = await ask({ heading: 'Add a link', label: 'Web address to link to', ok: 'Add link' });
    if (address) wrapSelection('[', `](${address})`, 'link text');
  },
  async video() {
    const address = await ask({ heading: 'Add a YouTube video', label: 'Paste the address of the video', ok: 'Add video' });
    if (address) insertAtCursor(address);
  },
};

function handleToolbarClick(event) {
  const button = event.target.closest('[data-format]');
  if (button) FORMATS[button.dataset.format]();
}

// ---------- Editing one entry ----------
const lines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);

function readFields() {
  return {
    title: form.elements.title.value,
    date: form.elements.date.value,
    description: form.elements.description.value,
    ...(state.kind === 'article' ? { section: form.elements.section.value, featured: form.elements.featured.checked } : {}),
    tags: state.tags,
    todo: lines(form.elements.todo.value),
    coverImage: state.coverImage,
    coverImageAlignment: form.elements.coverImageAlignment.value,
    draft: !form.elements.published.checked,
  };
}

function refreshPreview() {
  const fields = readFields();
  previewForm.action = `${API}${entryPath(state.kind, state.slug)}/preview`;
  previewForm.elements.title.value = fields.title;
  previewForm.elements.date.value = fields.date;
  previewForm.elements.description.value = fields.description;
  previewForm.elements.section.value = fields.section ?? '';
  previewForm.elements.tags.value = fields.tags.join('\n');
  previewForm.elements.todo.value = fields.todo.join('\n');
  previewForm.elements.coverImage.value = fields.coverImage;
  previewForm.elements.coverImageAlignment.value = fields.coverImageAlignment;
  previewForm.elements.body.value = bodyField.value;
  postPreview(previews.get('entry'), previewForm);
}

function markDirty() {
  state.dirty = true;
  setStatus(UNSAVED, 'pending');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, PREVIEW_DELAY_MS);
}

function fillForm(entry, etag) {
  state.etag = etag;
  state.tags = [...entry.tags];
  state.coverImage = entry.coverImage;
  state.coverUrl = entry.coverUrl;
  form.elements.title.value = entry.title;
  form.elements.date.value = entry.date;
  form.elements.description.value = entry.description;
  form.elements.section.value = entry.section || 'news';
  form.elements.description.placeholder = entry.autoDescription;
  form.elements.published.checked = !entry.draft;
  form.elements.featured.checked = entry.featured;
  form.elements.todo.value = entry.todo.join('\n');
  form.elements.coverImageAlignment.value = entry.coverImageAlignment;
  bodyField.value = entry.body;
  $('#editor-heading').textContent = entry.title;
  $('[data-view]').href = entry.url;
  drawTags();
  drawPictures();
  state.dirty = false;
}

async function showEditor(kind, slug) {
  state.kind = kind;
  state.slug = slug;
  markCurrentLink(COLLECTIONS[kind]);
  $('[data-back]').href = kind === 'page' ? '/edit/pages' : '/edit';
  $$('[data-article-only]').forEach((element) => {
    element.hidden = kind !== 'article';
  });
  try {
    const [entry, pictures, tags] = await Promise.all([request(entryPath(kind, slug)), request(`${entryPath(kind, slug)}/images`), request('/tags')]);
    state.pictures = pictures.data;
    $('#known-tags').replaceChildren(...tags.data.map((tag) => new Option(tag, tag)));
    fillForm(entry.data, entry.etag);
    setStatus(entry.data.draft ? 'This is a draft. Only editors can see it.' : 'This is live on the site.');
    show(panes.editor);
    refreshPreview();
  } catch (error) {
    if (error.status === 404) navigate(kind === 'page' ? '/edit/pages' : '/edit');
    else if (error.status !== 401) setStatus(error.message, 'error');
  }
}

async function saveEntry(event) {
  event.preventDefault();
  if (tagInput.value.trim()) addTag(tagInput.value);
  if (!form.elements.title.value.trim()) {
    setStatus('Please give it a title before saving.', 'error');
    form.elements.title.focus();
    return;
  }
  const saveButton = $('[data-save]');
  saveButton.disabled = true;
  setStatus('Saving…', 'pending');
  try {
    const { data, etag } = await request(entryPath(state.kind, state.slug), {
      method: 'PUT',
      headers: { 'If-Match': state.etag },
      body: { fields: readFields(), body: bodyField.value },
    });
    clearTimeout(previewTimer);
    fillForm(data, etag);
    setStatus(data.draft ? 'Saved as a draft. Only editors can see it.' : 'Saved. It is live on the site now.', 'good');
    refreshPreview();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteEntry() {
  const title = form.elements.title.value;
  const sure = await ask({ heading: `Delete “${title}”?`, text: 'It will disappear from the site straight away. The site owner can bring it back from the backup if this was a mistake.', ok: 'Delete it', input: false });
  if (!sure) return;
  try {
    await request(entryPath(state.kind, state.slug), { method: 'DELETE' });
    state.dirty = false;
    navigate(state.kind === 'page' ? '/edit/pages' : '/edit');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

// ---------- New entry ----------
const toSlug = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

function openNewDialog() {
  const dialog = $('#new-dialog');
  $('#new-heading').textContent = WORDS[state.kind].heading;
  $('[data-origin]').textContent = `${window.location.host}/`;
  $('[data-new-error]').hidden = true;
  $('#new-form').reset();
  delete $('#new-slug').dataset.touched;
  dialog.showModal();
}

function suggestSlug() {
  const slugField = $('#new-slug');
  if (!slugField.dataset.touched) slugField.value = toSlug($('#new-title').value);
}

function markSlugTouched() {
  $('#new-slug').dataset.touched = 'true';
}

async function createEntry(event) {
  event.preventDefault();
  const errorLine = $('[data-new-error]');
  try {
    const { data } = await request(`/${COLLECTIONS[state.kind]}`, { method: 'POST', body: { title: $('#new-title').value, slug: $('#new-slug').value } });
    $('#new-dialog').close();
    navigate(`/edit/${data.kind}/${data.slug}`);
  } catch (error) {
    errorLine.textContent = error.message;
    errorLine.hidden = false;
  }
}

function closeDialog(event) {
  event.target.closest('dialog').close();
}

// ---------- Choosing what something links to ----------
async function loadLinkChoices() {
  if (linkChoices) return;
  const { data } = await request('/links');
  linkChoices = data;
  $('#known-articles').replaceChildren(...data.articles.map((article) => new Option(article.title, article.slug)));
}

function buildGroup(group) {
  const element = document.createElement('optgroup');
  element.label = group.label;
  element.append(...group.options.map((option) => new Option(option.label, option.value)));
  return element;
}

const pickerOf = (row) => row.querySelector(':scope > details [data-picker]');

function showPickerExtras(picker) {
  const choice = $('[data-link]', picker).value;
  $('[data-link-article-label]', picker).hidden = choice !== 'article';
  $('[data-link-url-label]', picker).hidden = choice !== 'url';
}

function fillPicker(row, link) {
  const picker = pickerOf(row);
  picker.append(clone('link-picker'));
  const select = $('[data-link]', picker);
  $('option[value="article"]', select).before(...linkChoices.groups.map(buildGroup));
  if (link?.type === 'article') {
    select.value = 'article';
    $('[data-link-article]', picker).value = link.target;
  } else if (link?.type === 'url') {
    select.value = 'url';
    $('[data-link-url]', picker).value = link.target;
  } else {
    select.value = link ? `${link.type}:${link.target}` : '';
  }
  showPickerExtras(picker);
}

function readPicker(row) {
  const picker = pickerOf(row);
  const choice = $('[data-link]', picker).value;
  if (!choice) return null;
  if (choice === 'article') return { type: 'article', target: $('[data-link-article]', picker).value.trim() };
  if (choice === 'url') return { type: 'url', target: $('[data-link-url]', picker).value.trim() };
  const [type, ...target] = choice.split(':');
  return { type, target: target.join(':') };
}

// The name of what a row links to, for its one-line summary.
function describeLink(row) {
  const picker = pickerOf(row);
  const select = $('[data-link]', picker);
  if (select.value === 'url') return $('[data-link-url]', picker).value.trim();
  if (select.value !== 'article') return select.value ? select.selectedOptions[0].textContent : '';
  const slug = $('[data-link-article]', picker).value.trim();
  return linkChoices.articles.find((article) => article.slug === slug)?.title ?? slug;
}

function handlePickerChange(event) {
  const select = event.target.closest('[data-link]');
  if (select) showPickerExtras(select.closest('[data-picker]'));
}

// ---------- Rows that can be moved and removed ----------
function setPaneStatus(pane, text, tone = '') {
  const line = $('.status', pane);
  line.textContent = text;
  line.dataset.tone = tone;
}

// Brings each row's summary line and arrow buttons up to date.
function tidyRows(pane) {
  $$('.row', pane).forEach((row) => {
    const name = row.querySelector(':scope > details [data-names]').value.trim();
    const destination = describeLink(row);
    row.querySelector(':scope > details [data-summary-name]').textContent = name || destination || 'New: press to fill in';
    row.querySelector(':scope > details [data-summary-link]').textContent = name && destination ? `links to ${destination}` : '';
    row.querySelector(':scope > .row-buttons [data-move="up"]').disabled = !row.previousElementSibling;
    row.querySelector(':scope > .row-buttons [data-move="down"]').disabled = !row.nextElementSibling;
  });
}

function refreshSettingsPreview(name) {
  settingsPreviewForm.action = `${API}/settings/${name}/preview`;
  settingsPreviewForm.elements.data.value = JSON.stringify(SETTINGS[name].read());
  postPreview(previews.get(name), settingsPreviewForm);
}

// Called after any change to the home page or menus form.
function settingsChanged(name) {
  state.dirty = true;
  tidyRows(panes[name]);
  setPaneStatus(panes[name], UNSAVED, 'pending');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshSettingsPreview, PREVIEW_DELAY_MS, name);
}

const paneName = (event) => event.currentTarget.closest('section').id;

function markSettingsDirty(event) {
  settingsChanged(paneName(event));
}

// Moving into a part of the form shows that part of the page in the preview.
function handleSettingsFocus(event) {
  const fieldset = event.target.closest('fieldset[data-shows]');
  if (!fieldset) return;
  const preview = previews.get(paneName(event));
  const moved = preview.focus?.selector !== fieldset.dataset.shows;
  preview.focus = { selector: fieldset.dataset.shows, opensMenu: fieldset.hasAttribute('data-opens-menu'), row: event.target.closest('[data-menu="primary"] > .row') };
  spotlight(preview, { scroll: moved });
}

// Handles the Move up, Move down and Remove buttons (rows can also be dragged). True if a row changed.
function handleRowButton(event) {
  const row = event.target.closest('.row');
  const move = event.target.closest('[data-move]');
  if (move?.dataset.move === 'up') row.previousElementSibling?.before(row);
  else if (move?.dataset.move === 'down') row.nextElementSibling?.after(row);
  else if (event.target.closest('[data-remove-row]')) row.remove();
  else return false;
  return true;
}

// ---------- Dragging rows ----------
// A row is dragged by its grip, up and down the list it is already in. It
// moves through the list as the pointer passes its neighbours, so what is
// shown while dragging is what will be kept. Pointer events cover mouse,
// touch and pen alike.
let drag = null;
const DRAG_EDGE_PX = 60;
const DRAG_SCROLL_PX = 12;

// Puts the dragged row where the pointer now is among its neighbours.
function placeDraggedRow() {
  const { row, y } = drag;
  const isBelowPointer = (other) => {
    const box = other.getBoundingClientRect();
    return y < box.top + box.height / 2;
  };
  const others = [...row.parentElement.children].filter((other) => other !== row);
  const next = others.find(isBelowPointer) ?? null;
  if (next !== row.nextElementSibling) row.parentElement.insertBefore(row, next);
}

// While the pointer is held near the top or bottom of the window the page
// scrolls, so a row can be taken further than what is on screen.
function scrollWhileDragging() {
  if (!drag) return;
  if (drag.y < DRAG_EDGE_PX) window.scrollBy(0, -DRAG_SCROLL_PX);
  else if (drag.y > window.innerHeight - DRAG_EDGE_PX) window.scrollBy(0, DRAG_SCROLL_PX);
  placeDraggedRow();
  requestAnimationFrame(scrollWhileDragging);
}

function startRowDrag(event) {
  const grip = event.target.closest('[data-drag]');
  if (!grip || event.button > 0) return;
  event.preventDefault();
  const row = grip.closest('.row');
  drag = { row, y: event.clientY, pane: paneName(event), order: [...row.parentElement.children] };
  grip.setPointerCapture(event.pointerId);
  row.classList.add('dragging');
  requestAnimationFrame(scrollWhileDragging);
}

function moveRowDrag(event) {
  if (drag) drag.y = event.clientY;
}

function endRowDrag() {
  if (!drag) return;
  const { row, pane, order } = drag;
  drag = null;
  row.classList.remove('dragging');
  const moved = order.some((other, index) => row.parentElement.children[index] !== other);
  if (moved) settingsChanged(pane);
}

function listenForRowDrags(target) {
  target.addEventListener('pointerdown', startRowDrag);
  target.addEventListener('pointermove', moveRowDrag);
  target.addEventListener('pointerup', endRowDrag);
  target.addEventListener('pointercancel', endRowDrag);
}

// ---------- Home page ----------
const homeForm = $('#home-form');
const HOME_TEXT_FIELDS = ['kicker', 'headline', 'intro', 'heroAlt', 'tasksHeading', 'joinHeading', 'joinText'];

function buildTaskRow(task) {
  const row = $('.row', clone('task-row'));
  $('[data-title]', row).value = task?.title ?? '';
  $('[data-text]', row).value = task?.text ?? '';
  fillPicker(row, task?.link ?? null);
  // A new box starts open, ready to be filled in.
  $('details', row).open = !task;
  return row;
}

const readTaskRow = (row) => ({ title: $('[data-title]', row).value, text: $('[data-text]', row).value, link: readPicker(row) });

function drawHero() {
  const image = $('[data-hero-image]');
  image.hidden = !state.heroImage;
  if (state.heroImage) image.src = `${state.heroImage}?w=500`;
  $('[data-hero-default]').hidden = Boolean(state.heroImage);
}

function fillHome(home, etag) {
  state.settingsEtag = etag;
  state.heroImage = home.heroImage;
  HOME_TEXT_FIELDS.forEach((name) => {
    homeForm.elements[name].value = home[name];
  });
  homeForm.elements.showLatest.checked = home.showLatest;
  $('[data-tasks]').replaceChildren(...home.tasks.map(buildTaskRow));
  drawHero();
  tidyRows(panes.home);
  state.dirty = false;
}

async function showHome() {
  markCurrentLink('home');
  await loadLinkChoices();
  const { data, etag } = await request('/settings/home');
  fillHome(data, etag);
  setPaneStatus(panes.home, '');
  show(panes.home);
  refreshSettingsPreview('home');
}

function readHome() {
  const fields = Object.fromEntries(HOME_TEXT_FIELDS.map((name) => [name, homeForm.elements[name].value]));
  return { ...fields, heroImage: state.heroImage, showLatest: homeForm.elements.showLatest.checked, tasks: $$('[data-tasks] > .row').map(readTaskRow) };
}

async function saveSettings(event) {
  event.preventDefault();
  const name = paneName(event);
  const pane = panes[name];
  const { read, fill } = SETTINGS[name];
  const saveButton = $('[type="submit"]', pane);
  saveButton.disabled = true;
  setPaneStatus(pane, 'Saving…', 'pending');
  try {
    const { data, etag } = await request(`/settings/${name}`, { method: 'PUT', headers: { 'If-Match': state.settingsEtag }, body: read() });
    clearTimeout(previewTimer);
    fill(data, etag);
    setPaneStatus(pane, 'Saved. It is live on the site now.', 'good');
    refreshSettingsPreview(name);
  } catch (error) {
    setPaneStatus(pane, error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
}

function handleHomeClick(event) {
  let changed = handleRowButton(event);
  if (event.target.closest('[data-action="add-task"]') && $$('[data-tasks] > .row').length < MAX_TASKS) {
    $('[data-tasks]').append(buildTaskRow(null));
    changed = true;
  }
  if (event.target.closest('[data-action="hero-upload"]')) $('[data-hero-file]').click();
  if (changed) markSettingsDirty(event);
}

async function uploadHero(event) {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  const uploadStatus = $('[data-hero-status]');
  uploadStatus.textContent = 'Uploading…';
  const body = new FormData();
  body.append('image', file);
  try {
    const { data } = await request('/settings/home/images', { method: 'POST', body });
    state.heroImage = data.url;
    drawHero();
    uploadStatus.textContent = 'Uploaded. Press Save to put it on the home page.';
    settingsChanged('home');
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
}

// ---------- Menus ----------
function buildMenuRow(item, { child }) {
  const row = $('.row', clone('menu-row'));
  $('[data-label]', row).value = item?.label ?? '';
  fillPicker(row, item?.link ?? null);
  $('details', row).open = !item;
  if (child) {
    $('[data-children]', row).remove();
    $('[data-add-child]', row).remove();
  } else {
    $('[data-children]', row).append(...(item?.children ?? []).map((entry) => buildMenuRow(entry, { child: true })));
  }
  return row;
}

const readMenuRow = (row) => ({
  label: row.querySelector(':scope > details [data-label]').value,
  link: readPicker(row),
  children: [...(row.querySelector(':scope > [data-children]')?.children ?? [])].map(readMenuRow),
});

const menuList = (name) => $(`[data-menu="${name}"]`);

function fillMenu(menu, etag) {
  state.settingsEtag = etag;
  ['primary', 'footer'].forEach((name) => menuList(name).replaceChildren(...menu[name].map((item) => buildMenuRow(item, { child: false }))));
  tidyRows(panes.menu);
  state.dirty = false;
}

async function showMenu() {
  markCurrentLink('menu');
  await loadLinkChoices();
  const { data, etag } = await request('/settings/menu');
  fillMenu(data, etag);
  setPaneStatus(panes.menu, '');
  show(panes.menu);
  refreshSettingsPreview('menu');
}

const readMenu = () => Object.fromEntries(['primary', 'footer'].map((name) => [name, [...menuList(name).children].map(readMenuRow)]));

const SETTINGS = { home: { read: readHome, fill: fillHome }, menu: { read: readMenu, fill: fillMenu } };

function handleMenuClick(event) {
  let changed = handleRowButton(event);
  const addItem = event.target.closest('[data-action="add-item"]');
  const addChild = event.target.closest('[data-action="add-child"]');
  if (addItem && menuList(addItem.dataset.list).children.length < MAX_MENU_ITEMS) {
    menuList(addItem.dataset.list).append(buildMenuRow(null, { child: false }));
    changed = true;
  }
  if (addChild) {
    addChild.closest('.row').querySelector(':scope > [data-children]').append(buildMenuRow(null, { child: true }));
    changed = true;
  }
  if (changed) markSettingsDirty(event);
}

// ---------- People ----------
function buildPerson(person) {
  const row = clone('person-row');
  $('[data-email]', row).textContent = person.email;
  $('[data-owner]', row).hidden = !person.owner;
  const remove = $('[data-remove]', row);
  remove.hidden = person.owner;
  remove.dataset.email = person.email;
  return row;
}

const drawPeople = (people) => $('[data-people]').replaceChildren(...people.map(buildPerson));

async function showPeople() {
  markCurrentLink('people');
  show(panes.people);
  const { data } = await request('/people');
  drawPeople(data);
}

async function addPerson(event) {
  event.preventDefault();
  const errorLine = $('[data-people-error]');
  errorLine.hidden = true;
  try {
    const { data } = await request('/people', { method: 'POST', body: { email: $('#person-email').value } });
    drawPeople(data);
    $('#people-form').reset();
  } catch (error) {
    errorLine.textContent = error.message;
    errorLine.hidden = false;
  }
}

async function removePerson(event) {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  await request(`/people/${encodeURIComponent(button.dataset.email)}`, { method: 'DELETE' });
  await showPeople();
}

// ---------- Routing ----------
function route() {
  const path = decodeURIComponent(window.location.pathname).replace(/\/+$/, '');
  const entry = /^\/edit\/(article|page)\/(.+)$/.exec(path);
  if (entry) return showEditor(entry[1], entry[2]);
  if (path === '/edit/pages') return showList('page');
  if (path === '/edit/home') return showHome();
  if (path === '/edit/menu') return showMenu();
  if (path === '/edit/people' && state.editor.owner) return showPeople();
  return showList('article');
}

function navigate(path) {
  window.history.pushState(null, '', path);
  route();
}

async function leaveIfClean() {
  if (!state.dirty) return true;
  const leave = await ask({ heading: 'Leave without saving?', text: 'You have changes that are not saved. If you leave now they will be lost.', ok: 'Leave without saving', input: false });
  if (leave) state.dirty = false;
  return Boolean(leave);
}

async function handleLinkClick(event) {
  const link = event.target.closest('a[href^="/edit"]');
  if (!link || link.target === '_blank' || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  if (await leaveIfClean()) navigate(link.getAttribute('href'));
}

function warnBeforeUnload(event) {
  if (state.dirty) event.preventDefault();
}

async function signOut() {
  if (!(await leaveIfClean())) return;
  await request('/session', { method: 'DELETE' });
  window.location.assign('/edit');
}

// ---------- Start ----------
async function start() {
  const { data } = await request('/session');
  if (!data.editor) {
    $('[data-sign-in-link]').hidden = !data.signInReady;
    $('[data-sign-in-unready]').hidden = data.signInReady;
    showSignIn();
    return;
  }
  state.editor = data.editor;
  $('[data-who]').textContent = data.editor.name;
  $('.who').hidden = false;
  $('.bar nav').hidden = false;
  $('[data-owner-only]').hidden = !data.editor.owner;
  $('[data-backup-warning]').hidden = !data.backup?.lastError;

  $$('[data-preview]').forEach(buildPreview);
  setPreviewSize(startingSize());
  document.addEventListener('click', handleLinkClick);
  window.addEventListener('popstate', route);
  window.addEventListener('beforeunload', warnBeforeUnload);
  $('[data-action="sign-out"]').addEventListener('click', signOut);
  $('[data-action="new"]').addEventListener('click', openNewDialog);
  $('#list-search').addEventListener('input', scheduleListSearch);
  $('#new-title').addEventListener('input', suggestSlug);
  $('#new-slug').addEventListener('input', markSlugTouched);
  $('#new-form').addEventListener('submit', createEntry);
  $$('[data-action="close-dialog"]').forEach((button) => button.addEventListener('click', closeDialog));
  form.addEventListener('submit', saveEntry);
  form.addEventListener('input', markDirty);
  tagInput.addEventListener('keydown', handleTagKey);
  tagInput.addEventListener('blur', handleTagBlur);
  $('[data-tags]').addEventListener('click', handleChipClick);
  $('.toolbar').addEventListener('click', handleToolbarClick);
  $('[data-pictures]').addEventListener('click', handlePictureClick);
  $('[data-action="upload"]').addEventListener('click', choosePicture);
  $('[data-file]').addEventListener('change', uploadPicture);
  $('[data-action="delete"]').addEventListener('click', deleteEntry);
  $('#people-form').addEventListener('submit', addPerson);
  $('[data-people]').addEventListener('click', removePerson);
  homeForm.addEventListener('submit', saveSettings);
  homeForm.addEventListener('input', markSettingsDirty);
  homeForm.addEventListener('focusin', handleSettingsFocus);
  homeForm.addEventListener('change', handlePickerChange);
  homeForm.addEventListener('click', handleHomeClick);
  $('[data-hero-file]').addEventListener('change', uploadHero);
  $('#menu-form').addEventListener('submit', saveSettings);
  $('#menu-form').addEventListener('input', markSettingsDirty);
  $('#menu-form').addEventListener('focusin', handleSettingsFocus);
  $('#menu-form').addEventListener('change', handlePickerChange);
  $('#menu-form').addEventListener('click', handleMenuClick);
  listenForRowDrags(homeForm);
  listenForRowDrags($('#menu-form'));

  await route();
}

start();
