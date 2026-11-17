// Tiny server-side templating: html`...` escapes every interpolated value
// unless it is already a Safe string produced by html`` or raw().

class Safe {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
export const raw = (value) => new Safe(value);

const render = (value) => {
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === false || value === null || value === undefined) return '';
  return escape(value);
};

export const html = (strings, ...values) =>
  new Safe(strings.reduce((out, s, i) => out + s + (i < values.length ? render(values[i]) : ''), ''));

// Blank-line separated paragraphs with **bold** and [text](https://link). Everything else is escaped.
// Links run on already-escaped text and only accept https, so nothing can break out of the href.
const LINK = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;

export const richText = (source) =>
  raw(
    String(source ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escape(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(LINK, '<a href="$2" rel="noopener">$1</a>').replace(/\n/g, '<br>')}</p>`)
      .join('\n'),
  );
