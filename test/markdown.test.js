import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarise, renderMarkdown, resolveUrl } from '../src/markdown.js';

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

test('description is cut at a word, within what search engines show', () => {
  const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
  const { description, readingTime } = renderMarkdown(`## Heading\n\n${words}`);
  assert.ok(description.length <= 156);
  assert.match(description, /^word0 word1 .* word\d+…$/);
  assert.equal(readingTime, '1 min read');
  assert.equal(renderMarkdown('Short and whole.').description, 'Short and whole.');
});

test('description prefers to stop at the end of a sentence', () => {
  const first = 'The council has published its plans for the seafront, and we have a lot to say about the cycle route that runs along it.';
  assert.equal(summarise(`${first} ${'A second sentence that runs on for quite a while without stopping at all '.repeat(3)}`), first);
});

test('a body that uses a top-level heading has its headings moved down', () => {
  const { html } = renderMarkdown('# Top\n\n## Next\n\ntext');
  assert.match(html, /<h2 id="top">Top<\/h2>/);
  assert.match(html, /<h3 id="next">Next<\/h3>/);
  assert.match(renderMarkdown('## Only').html, /<h2 id="only">/);
});

test("links to the site's old addresses become links within the site", () => {
  const { html } = renderMarkdown('[a](http://www.pompeybug.co.uk/infrastructure/) [b](https://pompey.bike/join) [c](https://pompeybug.co.uk) [d](https://example.org/pompeybug.co.uk/)');
  assert.match(html, /<a href="\/infrastructure\/"/);
  assert.match(html, /<a href="\/join"/);
  assert.match(html, /<a href="\/"/);
  assert.match(html, /<a href="https:\/\/example\.org\/pompeybug\.co\.uk\/"/);
});

test('headings get unique ids', () => {
  const { html } = renderMarkdown('## Same\n\n## Same');
  assert.match(html, /<h2 id="same">/);
  assert.match(html, /<h2 id="same-1">/);
});
