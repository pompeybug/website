// The editor at /edit. One page, four panes (sign in, list, editor, people),
// each with its own address so it can be bookmarked or sent to someone:
//   /edit                 articles      /edit/pages          pages
//   /edit/article/<slug>  one article   /edit/page/<slug>    one page
//   /edit/people          who can edit (site owners only)

const API = '/edit/api';
const PREVIEW_DELAY_MS = 700;
const SEARCH_DELAY_MS = 250;
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

const panes = { signIn: $('#sign-in'), list: $('#list'), editor: $('#editor'), people: $('#people') };
const form = $('#entry-form');
const previewForm = $('#preview-form');
const previewFrame = $('iframe[name="preview-frame"]');
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
  previewScroll: 0,
};
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

// ---------- List ----------
function buildRow(entry) {
  const row = clone('entry-row');
  const link = $('a', row);
  link.href = `/edit/${entry.kind}/${entry.slug}`;
  $('[data-title]', row).textContent = entry.title;
  $('[data-draft]', row).hidden = !entry.draft;
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
    tags: state.tags,
    todo: lines(form.elements.todo.value),
    coverImage: state.coverImage,
    coverImageAlignment: form.elements.coverImageAlignment.value,
    draft: !form.elements.published.checked,
  };
}

function refreshPreview() {
  const fields = readFields();
  try {
    state.previewScroll = previewFrame.contentWindow.scrollY;
  } catch {
    state.previewScroll = 0;
  }
  previewForm.action = `${API}${entryPath(state.kind, state.slug)}/preview`;
  previewForm.elements.title.value = fields.title;
  previewForm.elements.date.value = fields.date;
  previewForm.elements.description.value = fields.description;
  previewForm.elements.tags.value = fields.tags.join('\n');
  previewForm.elements.todo.value = fields.todo.join('\n');
  previewForm.elements.coverImage.value = fields.coverImage;
  previewForm.elements.coverImageAlignment.value = fields.coverImageAlignment;
  previewForm.elements.body.value = bodyField.value;
  previewForm.submit();
}

function restorePreviewScroll() {
  try {
    previewFrame.contentWindow.scrollTo(0, state.previewScroll);
  } catch {
    // The frame is showing something this page may not script; nothing to restore.
  }
}

function markDirty() {
  state.dirty = true;
  setStatus('You have changes that are not saved yet.', 'pending');
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
  form.elements.description.placeholder = entry.autoDescription;
  form.elements.published.checked = !entry.draft;
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
  previewFrame.addEventListener('load', restorePreviewScroll);
  $('#people-form').addEventListener('submit', addPerson);
  $('[data-people]').addEventListener('click', removePerson);

  await route();
}

start();
