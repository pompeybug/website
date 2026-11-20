import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let dir;
let content;
let settings;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'pcf-settings-'));
  await mkdir(path.join(dir, 'content/articles'), { recursive: true });
  await mkdir(path.join(dir, 'content/pages'), { recursive: true });
  await writeFile(path.join(dir, 'content/pages/join.md'), '---\ntitle: Become a Member\n---\n\nJoin.\n');
  await writeFile(path.join(dir, 'content/pages/hidden.md'), '---\ntitle: Hidden\ndraft: true\n---\n\nNot yet.\n');
  await writeFile(path.join(dir, 'content/articles/old.md'), '---\ntitle: Old campaign\ndate: 2020-01-01\nsection: campaigns\nfeatured: true\n---\n\nOld.\n');
  await writeFile(path.join(dir, 'content/articles/new.md'), '---\ntitle: New campaign\ndate: 2024-01-01\nsection: campaigns\n---\n\nNew.\n');
  process.env.DATA_DIR = dir;
  process.env.CONTENT_GIT = 'off';
  content = await import('../src/content.js');
  settings = await import('../src/settings.js');
  await content.init();
  await settings.init();
});

after(() => rm(dir, { recursive: true, force: true }));

const save = (name, data) => settings.save(name, data, settings.revision(name), 'Tester');

test('a link is stored as what it points at and resolved to an address', () => {
  assert.deepEqual(settings.resolveLink({ type: 'page', target: 'join' }), { href: '/join', title: 'Become a Member' });
  assert.equal(settings.resolveLink({ type: 'section', target: 'campaigns' }).href, '/campaigns');
  assert.equal(settings.resolveLink({ type: 'site', target: 'archive' }).href, '/archive');
  assert.equal(settings.resolveLink({ type: 'url', target: 'https://example.org' }).outside, true);
});

test('links to drafts, missing pages and unsafe addresses do not resolve', () => {
  assert.equal(settings.resolveLink({ type: 'page', target: 'hidden' }), null);
  assert.equal(settings.resolveLink({ type: 'page', target: 'gone' }), null);
  assert.equal(settings.resolveLink({ type: 'url', target: 'javascript:alert(1)' }), null);
});

test('the built-in menu leaves out items whose pages do not exist', () => {
  const menu = settings.resolvedMenu();
  assert.ok(menu.primary.some((item) => item.href === '/campaigns'));
  assert.ok(menu.primary.every((item) => item.href));
  assert.ok(!JSON.stringify(menu).includes('/about'));
});

test('a saved menu is written to the content folder and takes its names from the pages', async () => {
  await save('menu', { primary: [{ label: '', link: { type: 'page', target: 'join' }, children: [{ label: 'Elsewhere', link: { type: 'url', target: 'https://example.org' }, children: [{ label: 'too deep', link: { type: 'page', target: 'join' } }] }] }], footer: [] });
  const stored = JSON.parse(await readFile(path.join(dir, 'content/settings/menu.json'), 'utf8'));
  assert.deepEqual(stored.primary[0].children[0].children, []);
  const [item] = settings.resolvedMenu().primary;
  assert.equal(item.label, 'Become a Member');
  assert.equal(item.children[0].href, 'https://example.org');
});

test('a save based on an old version is refused', async () => {
  await assert.rejects(settings.save('menu', { primary: [], footer: [] }, 'stale', 'Tester'), (error) => error.status === 412);
});

test('a menu item that links nowhere is refused', async () => {
  await assert.rejects(save('menu', { primary: [{ label: 'Broken', link: { type: 'page', target: 'gone' } }], footer: [] }), (error) => error.status === 422);
});

test('the home page needs a headline and keeps only pictures from this site', async () => {
  await assert.rejects(save('home', { headline: ' ' }), (error) => error.status === 422);
  const saved = await save('home', { headline: 'Streets for people', heroImage: 'https://evil.example/x.jpg', tasks: [{ title: 'Join', text: '', link: { type: 'page', target: 'join' } }] });
  assert.equal(saved.heroImage, '');
  assert.equal(settings.resolvedHome().tasks[0].href, '/join');
});

test('featured articles come before newer ones on the home page', () => {
  assert.deepEqual(settings.resolvedHome().campaigns.map((article) => article.slug), ['old', 'new']);
});
