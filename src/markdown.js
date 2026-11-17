// Markdown to HTML for articles and pages. Editors are trusted (allow-listed
// Google accounts), so raw HTML in the source is passed through, as it was on
// the old site.

import { Marked } from 'marked';
import slugify from '@sindresorhus/slugify';
import { escape } from './html.js';

const RASTER = /\.(jpe?g|png|webp|avif)$/i;
const BODY_IMAGE_WIDTH = 1200;
const WORDS_PER_MINUTE = 200;
const DESCRIPTION_WORDS = 20;

const YOUTUBE_LINE = /^[ \t]*<?https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:\S*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})\S*?>?[ \t]*$/gm;

const youtubeEmbed = (id) =>
  `\n<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></figure>\n`;

// Two old articles were written as MDX. Their only component use is a YouTube
// embed and an imported image, so those are translated and the imports dropped.
function fromMdx(source) {
  const imports = new Map();
  const withoutImports = source.replace(/^import\s+(?:(\w+)\s+from\s+)?(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"];?[ \t]*$/gm, (_line, name, from) => {
    if (name) imports.set(name, from);
    return '';
  });
  return withoutImports
    .replace(/<YouTube\s+id=["']([^"']+)["']\s*\/>/g, (_tag, id) => (id.startsWith('http') ? id : `https://www.youtube.com/watch?v=${id}`))
    .replace(/<Image\b([^>]*?)\/>/gs, (_tag, attrs) => {
      const alt = /alt=["']([^"']*)["']/.exec(attrs)?.[1] ?? '';
      const name = /src=\{(\w+)\}/.exec(attrs)?.[1];
      return `![${alt}](${imports.get(name) ?? ''})`;
    });
}

const isExternal = (href) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);

// Content written for the old site points at /public/assets/...; the files are
// served from /assets/. Relative paths belong to the entry's own folder.
export function resolveUrl(href, mediaBase) {
  const value = String(href ?? '').trim();
  if (!value || value.startsWith('#') || isExternal(value)) return value;
  if (value.startsWith('/public/')) return value.slice('/public'.length);
  if (value.startsWith('/')) return value;
  return `${mediaBase}/${value.replace(/^\.\//, '')}`;
}

const sized = (url, width) => (RASTER.test(url.split('?')[0]) && !isExternal(url) && !url.includes('?') ? `${url}?w=${width}` : url);

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)));

const toText = (fragment) => decodeEntities(fragment.replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function describe(htmlText) {
  const paragraphs = [...htmlText.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => toText(match[1])).filter(Boolean);
  const words = paragraphs.join(' ').split(' ').filter(Boolean);
  if (words.length === 0) return '';
  return `${words.slice(0, DESCRIPTION_WORDS).join(' ').replace(/\D$/, '')}...`;
}

function makeParser(mediaBase) {
  const usedIds = new Map();
  const parser = new Marked({ gfm: true });
  parser.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(toText(inner)) || 'section';
        const seen = usedIds.get(base) ?? 0;
        usedIds.set(base, seen + 1);
        const id = seen ? `${base}-${seen}` : base;
        return `<h${depth} id="${escape(id)}">${inner}</h${depth}>\n`;
      },
      image({ href, title, text }) {
        const src = sized(resolveUrl(href, mediaBase), BODY_IMAGE_WIDTH);
        const titleAttr = title ? ` title="${escape(title)}"` : '';
        return `<img src="${escape(src)}" alt="${escape(text)}"${titleAttr} loading="lazy" decoding="async">`;
      },
      link({ href, title, tokens }) {
        const url = resolveUrl(href, mediaBase);
        const titleAttr = title ? ` title="${escape(title)}"` : '';
        const rel = isExternal(url) ? ' rel="noopener"' : '';
        return `<a href="${escape(url)}"${titleAttr}${rel}>${this.parser.parseInline(tokens)}</a>`;
      },
    },
  });
  return parser;
}

// Returns the rendered body plus the plain-text values derived from it.
export function renderMarkdown(source, { mediaBase = '', mdx = false } = {}) {
  const prepared = (mdx ? fromMdx(source) : source).replace(YOUTUBE_LINE, (_line, id) => youtubeEmbed(id));
  const html = makeParser(mediaBase)
    .parse(prepared)
    .replace(/\b(src|href)="\/public\//g, '$1="/');
  const text = toText(html);
  const words = text ? text.split(' ').length : 0;
  return {
    html,
    text,
    description: describe(html),
    readingTime: `${Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min read`,
  };
}
