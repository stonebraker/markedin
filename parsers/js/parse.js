/**
 * .mi (markedin) parser
 *
 * Format spec:
 *   - YAML frontmatter between --- delimiters (supports full YAML: objects, arrays, nested)
 *   - Markdown body with template expressions:
 *       {{key}}                   — scalar interpolation
 *       {{key.nested.path}}       — deep path access
 *       {{array[0]}}              — array index access
 *       {{#each items}}...{{/each}}   — iterate array; inside, {{this}} or {{this.field}}
 *       {{#if condition}}...{{/if}}   — conditional block
 *       {{> partial_key}}             — inline another frontmatter string as markdown
 */

const SPEC_VERSION = '0.3.0';

const yaml = require('js-yaml');
const { marked } = require('marked');

// ─── Frontmatter extraction ───────────────────────────────────────────────────

function parse(source) {
  // Empty frontmatter block: ---\n---
  const EMPTY_FM_RE = /^---\r?\n---\r?\n?([\s\S]*)$/;
  const emptyMatch = source.match(EMPTY_FM_RE);
  if (emptyMatch) return { data: {}, body: emptyMatch[1] };

  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = source.match(FM_RE);
  if (!match) {
    return { data: {}, body: source };
  }
  const data = yaml.load(match[1]) ?? {};
  const body = match[2];
  return { data, body };
}

// ─── Path resolution ─────────────────────────────────────────────────────────

function resolvePath(obj, path) {
  // Supports: key, key.nested, key[0], key[0].nested, key.nested[1].deep
  const parts = path
    .replace(/\[(\d+)\]/g, '.$1')  // array[0] → array.0
    .split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

// ─── Truthiness ──────────────────────────────────────────────────────────────

function isTruthy(val) {
  if (val == null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val !== '';
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return true;
}

// ─── Format value ────────────────────────────────────────────────────────────

function formatValue(val) {
  if (val == null) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// ─── Block processing ────────────────────────────────────────────────────────

function findClose(str, nestedOpenRe, closeTag, from) {
  let depth = 1;
  let pos = from;
  while (depth > 0) {
    const closeIdx = str.indexOf(closeTag, pos);
    if (closeIdx === -1) return -1;
    nestedOpenRe.lastIndex = pos;
    let nm;
    while ((nm = nestedOpenRe.exec(str)) !== null && nm.index < closeIdx) {
      depth++;
    }
    if (--depth === 0) return closeIdx;
    pos = closeIdx + closeTag.length;
  }
  return -1;
}

function findTopLevelElse(content) {
  const re = /\{\{#if [\w.[\]]+\}\}|\{\{\/if\}\}|\{\{else\}\}/g;
  let depth = 0, m;
  while ((m = re.exec(content)) !== null) {
    if (m[0].startsWith('{{#if ')) depth++;
    else if (m[0] === '{{/if}}') depth--;
    else if (m[0] === '{{else}}' && depth === 0) return m.index;
  }
  return -1;
}

function processBlocks(str, openRe, nestedOpenRe, closeTag, fn) {
  let result = '';
  let lastEnd = 0;
  let m;
  while ((m = openRe.exec(str)) !== null) {
    const openEnd = m.index + m[0].length;
    const closeIdx = findClose(str, nestedOpenRe, closeTag, openEnd);
    if (closeIdx === -1) continue;
    const inner = str.slice(openEnd, closeIdx);
    result += str.slice(lastEnd, m.index);
    result += fn(m[1], inner);
    lastEnd = closeIdx + closeTag.length;
    openRe.lastIndex = lastEnd;
  }
  return result + str.slice(lastEnd);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(source, { embed = false } = {}) {
  const { data, body } = parse(source);
  let out = renderTemplate(body, data);
  if (embed) {
    out = out.trimEnd() + '\n\n<!-- frontmatter\n' + JSON.stringify(data, null, 2) + '\n-->\n';
  }
  return out;
}

function renderHtmlFrag(source) {
  const md = render(source);
  return marked.parse(md, { gfm: true });
}

function renderHtml(source, { embed = false } = {}) {
  const { data, body } = parse(source);
  const rendered = renderTemplate(body, data);
  const htmlBody = marked.parse(rendered, { gfm: true });
  const title = data.title || '';
  let dataBlock = '';
  if (embed) {
    dataBlock = '\n<script type="application/json" id="frontmatter">\n' + JSON.stringify(data, null, 2) + '\n</script>';
  }
  return HTML_TEMPLATE.replace('%TITLE%', title).replace('%DATA_BLOCK%', dataBlock).replace('%BODY%', htmlBody);
}

const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>%TITLE%</title>%DATA_BLOCK%
<style>
  body { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 1.0625rem; line-height: 1.65; color: #1f2937; }
  h1, h2, h3 { color: #111827; letter-spacing: -.02em; }
  h1 { font-size: 2rem; margin-bottom: .5rem; }
  h2 { font-size: 1.4rem; margin-top: 2.5rem; }
  h3 { font-size: 1.1rem; margin-top: 2rem; }
  code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: .875em; background: #f3f4f6; padding: .1em .35em; border-radius: 3px; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 1.25rem; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e7eb; }
  th { font-size: .8125rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  a { color: #2563eb; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
</style>
</head>
<body>
%BODY%
</body>
</html>`;

function renderTemplate(template, ctx) {
  const registry = new Map();
  let seq = 0;

  function protect(str) {
    const tok = `\x02${seq++}\x03`;
    registry.set(tok, str);
    return tok;
  }

  function restore(str) {
    let out = str;
    for (const [tok, val] of [...registry.entries()].reverse()) {
      out = out.split(tok).join(val);
    }
    return out;
  }

  let out = template;

  // 0. \{{ → protect as literal {{
  out = out.replace(/\\\{\{/g, () => protect('{{'));

  // 1. {{#each key}} ... {{/each}}
  out = processBlocks(out,
    /\{\{#each ([\w.[\]]+)\}\}/g,
    /\{\{#each [\w.[\]]+\}\}/g,
    '{{/each}}',
    (key, inner) => {
      const arr = resolvePath(ctx, key);
      if (!Array.isArray(arr)) return protect('');
      return protect(arr.map((item, i) => {
        const itemCtx = { ...ctx, this: item, '@index': i, '@first': i === 0, '@last': i === arr.length - 1 };
        if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(itemCtx, item);
        return renderTemplate(inner, itemCtx);
      }).join(''));
    }
  );

  // 2. {{#if key}} ... {{else}} ... {{/if}}
  out = processBlocks(out,
    /\{\{#if ([\w.[\]]+)\}\}/g,
    /\{\{#if [\w.[\]]+\}\}/g,
    '{{/if}}',
    (key, inner) => {
      const val = resolvePath(ctx, key);
      const elseIdx = findTopLevelElse(inner);
      const truthy = elseIdx === -1 ? inner : inner.slice(0, elseIdx);
      const falsy  = elseIdx === -1 ? '' : inner.slice(elseIdx + '{{else}}'.length);
      return protect(renderTemplate(isTruthy(val) ? truthy : falsy, ctx));
    }
  );

  // 3. {{> partial_key}}
  out = out.replace(/\{\{> ?([\w.[\]]+)\}\}/g, (_, path) => {
    const val = resolvePath(ctx, path);
    return val != null ? protect(String(val)) : '';
  });

  // 4. {{key}} — scalar interpolation
  out = out.replace(/\{\{([\w.[\]@]+)\}\}/g, (_, path) => {
    const val = resolvePath(ctx, path);
    if (val == null) return '';
    return protect(formatValue(val));
  });

  return restore(out);
}

module.exports = { SPEC_VERSION, parse, render, renderHtmlFrag, renderHtml, renderTemplate, resolvePath };
