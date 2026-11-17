import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir;
let content;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'pcf-content-'));
  await mkdir(path.join(dir, 'content/articles/in-a-folder'), { recursive: true });
  await mkdir(path.join(dir, 'content/pages/infrastructure/routes'), { recursive: true });
  await writeFile(path.join(dir, 'content/articles/2013-02-28-AGM-and-Open-Meeting.md'), '---\ntitle: AGM\nid: 42\ndate: 2013-02-28 19:00:00\ntags: meetings\ncaption: kept\n---\n\nThe AGM was held.\n');
  await writeFile(path.join(dir, 'content/articles/in-a-folder/index.md'), '---\ntitle: Folder\ndate: 2024-06-28\ntags:\n  - Velo City\n  - ride\ncoverImage: ./cover.jpg\ncoverImageAlignment: top\ntodo: fix links\n---\n\nA ride.\n');
  await writeFile(path.join(dir, 'content/articles/secret.md'), '---\ntitle: Secret\ndate: 2025-01-01\ndraft: true\n---\n\nNot yet.\n');
  await writeFile(path.join(dir, 'content/pages/infrastructure/routes/index.md'), '---\ntitle: Routes\n---\n\nRoutes.\n');
  process.env.DATA_DIR = dir;
  process.env.CONTENT_GIT = 'off';
  content = await import('../src/content.js');
  await content.init();
});

after(() => rm(dir, { recursive: true, force: true }));

test('file and folder articles get lower-case slugs', () => {
  assert.ok(content.getEntry('article', '2013-02-28-agm-and-open-meeting'));
  assert.ok(content.getEntry('article', 'in-a-folder'));
  assert.ok(content.getEntry('page', 'infrastructure/routes'));
});

test('front matter is normalised', () => {
  const folder = content.getEntry('article', 'in-a-folder');
  assert.deepEqual(folder.tags, ['Velo City', 'ride']);
  assert.deepEqual(folder.todo, ['fix links']);
  assert.equal(folder.cover, '/media/articles/in-a-folder/cover.jpg');
  assert.equal(folder.coverAlignName, 'top');
  assert.deepEqual(content.getEntry('article', '2013-02-28-agm-and-open-meeting').tags, ['meetings']);
});

test('drafts are left out of public lists and search', () => {
  assert.equal(content.listEntries('article').length, 2);
  assert.equal(content.listEntries('article', { drafts: true }).length, 3);
  assert.equal(content.searchArticles('not yet').length, 0);
});

test('articles are newest first and tags are slugged', () => {
  assert.deepEqual(content.listEntries('article').map((a) => a.slug), ['in-a-folder', '2013-02-28-agm-and-open-meeting']);
  assert.deepEqual(content.listTags().map((t) => t.slug), ['meetings', 'ride', 'velo-city']);
  assert.equal(content.articlesWithTag('velo-city').length, 1);
});

test('search puts title and tag matches before body matches', () => {
  assert.deepEqual(content.searchArticles('agm').map((a) => a.slug), ['2013-02-28-agm-and-open-meeting']);
  assert.deepEqual(content.searchArticles('a ride').map((a) => a.slug), ['in-a-folder']);
});

test('saving keeps front matter the editor does not manage', async () => {
  const entry = content.getEntry('article', '2013-02-28-agm-and-open-meeting');
  const saved = await content.saveEntry('article', entry.slug, { fields: { title: 'AGM 2013', date: '2013-02-28', tags: ['meetings', 'agm'], todo: [], coverImage: '', coverImageAlignment: 'middle', draft: false }, body: 'New text.', revision: entry.revision }, 'Tester');
  const text = await readFile(saved.file, 'utf8');
  assert.match(text, /^---\ntitle: AGM 2013\nid: 42\n/);
  assert.match(text, /caption: kept/);
  assert.match(text, /tags:\n {2}- meetings\n {2}- agm\n/);
  assert.match(text, /---\n\nNew text\.\n$/);
  assert.notEqual(saved.revision, entry.revision);
});

test('a save based on an old version is refused', async () => {
  await assert.rejects(content.saveEntry('article', 'in-a-folder', { fields: { title: 'x' }, body: 'x', revision: 'stale' }, 'Tester'), { status: 412 });
});

test('creating checks the web address and starts as a draft', async () => {
  await assert.rejects(content.createEntry('article', { slug: 'Bad Slug', title: 'x' }, 'Tester'), { status: 422 });
  await assert.rejects(content.createEntry('article', { slug: 'in-a-folder', title: 'x' }, 'Tester'), { status: 409 });
  const created = await content.createEntry('article', { slug: 'brand-new', title: 'Brand new' }, 'Tester');
  assert.equal(created.draft, true);
  assert.ok(existsSync(path.join(dir, 'content/articles/brand-new/index.md')));
});

test('an image upload moves a single-file article into its own folder', async () => {
  const before = content.getEntry('article', '2013-02-28-agm-and-open-meeting');
  const image = await content.addImage('article', before.slug, { originalName: 'My Photo.JPG', buffer: Buffer.from('x'), extension: 'jpg' }, 'Tester');
  assert.equal(image.source, './my-photo.jpg');
  const moved = content.getEntry('article', before.slug);
  assert.equal(moved.hasFolder, true);
  assert.equal(moved.revision, before.revision);
  assert.equal((await content.listImages('article', before.slug)).length, 1);
});

test('media paths cannot leave the content folder or expose source files', async () => {
  assert.equal(await content.mediaFile('../editors.json'), null);
  assert.equal(await content.mediaFile('articles/secret.md'), null);
  assert.equal(await content.mediaFile('.git/config'), null);
  assert.ok(await content.mediaFile('articles/2013-02-28-AGM-and-Open-Meeting/my-photo.jpg'));
});

test('deleting removes the entry and its folder', async () => {
  await content.deleteEntry('article', 'brand-new', 'Tester');
  assert.equal(content.getEntry('article', 'brand-new'), null);
  assert.equal(existsSync(path.join(dir, 'content/articles/brand-new')), false);
});

test('articles sit in a section, and an unknown one falls back to news', async () => {
  const { SECTIONS } = await import('../src/taxonomy.js');
  assert.equal(content.getEntry('article', 'in-a-folder').section, 'news');
  const created = await content.createEntry('article', { slug: 'sectioned', title: 'Sectioned' }, 'Tester');
  const saved = await content.saveEntry('article', 'sectioned', { fields: { title: 'Sectioned', section: 'campaigns', draft: false }, body: 'Text', revision: created.revision }, 'Tester');
  assert.equal(saved.section, 'campaigns');
  assert.ok(content.articlesInSection('campaigns').some((article) => article.slug === 'sectioned'));
  const edit = await readFile(new URL('../views/edit.html', import.meta.url), 'utf8');
  for (const section of SECTIONS) assert.match(edit, new RegExp(`<option value="${section.slug}">${section.title}</option>`));
});

test('an article cannot take the address of a section', async () => {
  await assert.rejects(content.createEntry('article', { slug: 'campaigns', title: 'Clash' }, 'Tester'), /already uses/);
});

test('search needs every word, and counts tags once per article', async () => {
  const created = await content.createEntry('article', { slug: 'elm-trial', title: 'Elm Grove trial' }, 'Tester');
  await content.saveEntry('article', 'elm-trial', { fields: { title: 'Elm Grove trial', tags: ['Elm Grove', 'elm-grove', 'wands'], draft: false }, body: 'The council removed the wands.', revision: created.revision }, 'Tester');
  assert.deepEqual(content.searchArticles('grove council').map((article) => article.slug), ['elm-trial']);
  assert.equal(content.searchArticles('grove nonsense').length, 0);
  assert.equal(content.listTags().find((tag) => tag.slug === 'elm-grove').count, 1);
});
