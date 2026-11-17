import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, resolveUrl } from '../src/markdown.js';

const base = '/media/articles/ride';

test('relative images are served from the entry folder at a sensible size', () => {
  const { html } = renderMarkdown('![A bike](./bike.jpg)', { mediaBase: base });
  assert.match(html, /<img src="\/media\/articles\/ride\/bike\.jpg\?w=1200" alt="A bike"/);
});

test('old /public/assets paths point at /assets', () => {
  assert.equal(resolveUrl('/public/assets/a.jpg', base), '/assets/a.jpg');
  const { html } = renderMarkdown('[doc](/public/assets/docs/a.pdf)\n\n<img src="/public/assets/b.jpg">', { mediaBase: base });
  assert.match(html, /href="\/assets\/docs\/a\.pdf"/);
  assert.match(html, /src="\/assets\/b\.jpg"/);
});

test('external links are left alone and marked noopener', () => {
  const { html } = renderMarkdown('[PCC](https://portsmouth.gov.uk)', { mediaBase: base });
  assert.match(html, /<a href="https:\/\/portsmouth\.gov\.uk" rel="noopener">PCC<\/a>/);
});

test('a YouTube address on its own line becomes an embedded video', () => {
  const { html } = renderMarkdown('Watch this:\n\nhttps://www.youtube.com/watch?v=Xyd_KGUh10g\n\nGood.', { mediaBase: base });
  assert.match(html, /<figure class="video"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/Xyd_KGUh10g"/);
  assert.match(html, /<p>Good\.<\/p>/);
});

test('a YouTube address inside a sentence stays a link', () => {
  const { html } = renderMarkdown('See https://youtu.be/Xyd_KGUh10g for more.', { mediaBase: base });
  assert.doesNotMatch(html, /<iframe/);
});

test('MDX imports are dropped and its components translated', () => {
  const source = "import { YouTube } from '@astro-community/astro-embed-youtube';\nimport img from './pic.jpg';\n\nHello\n\n<YouTube id=\"https://www.youtube.com/embed/Xyd_KGUh10g\"/>\n\n<Image alt=\"A path\" src={img} class=\"floater\"/>\n";
  const { html } = renderMarkdown(source, { mediaBase: base, mdx: true });
  assert.doesNotMatch(html, /import/);
  assert.match(html, /youtube-nocookie\.com\/embed\/Xyd_KGUh10g/);
  assert.match(html, /<img src="\/media\/articles\/ride\/pic\.jpg\?w=1200" alt="A path"/);
});

test('description is the first twenty words of the paragraphs', () => {
  const words = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
  const { description, readingTime } = renderMarkdown(`## Heading\n\n${words}`);
  assert.equal(description, `${Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')}...`);
  assert.equal(readingTime, '1 min read');
});

test('headings get unique ids', () => {
  const { html } = renderMarkdown('## Same\n\n## Same');
  assert.match(html, /<h2 id="same">/);
  assert.match(html, /<h2 id="same-1">/);
});
