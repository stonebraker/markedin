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

const yaml = require('js-yaml');

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

// ─── Render ───────────────────────────────────────────────────────────────────

function render(source) {
  const { data, body } = parse(source);
  return renderTemplate(body, data);
}

function renderTemplate(template, ctx) {
  // Use STX/ETX as token delimiters — vanishingly unlikely in real content.
  // Resolved content and already-rendered blocks are wrapped in these tokens
  // so subsequent regex passes cannot touch them. Each recursive call has its
  // own registry; by the time a recursive call returns, its tokens are fully
  // restored, so the parent call only ever sees clean strings.
  const registry = new Map();
  let seq = 0;

  function protect(str) {
    const tok = `\x02${seq++}\x03`;
    registry.set(tok, str);
    return tok;
  }

  function restore(str) {
    let out = str;
    for (const [tok, val] of registry) {
      out = out.split(tok).join(val);
    }
    return out;
  }

  // 1. Extract fenced and inline code blocks — they are never template targets
  let out = template.replace(/```[\s\S]*?```|`[^`\n]+`/g, m => protect(m));

  // 2. {{#each key}} ... {{/each}}
  out = out.replace(/\{\{#each ([\w.[\]]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, path, inner) => {
    const arr = resolvePath(ctx, path);
    if (!Array.isArray(arr)) return protect('');
    const result = arr.map((item, i) => {
      const itemCtx = { ...ctx, this: item, '@index': i, '@first': i === 0, '@last': i === arr.length - 1 };
      if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(itemCtx, item);
      return renderTemplate(inner, itemCtx);
    }).join('');
    return protect(result);
  });

  // 3. {{#if key}} ... {{else}} ... {{/if}}
  out = out.replace(/\{\{#if ([\w.[\]]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (_, path, truthy, falsy = '') => {
    const val = resolvePath(ctx, path);
    const isTruthy = val && (typeof val !== 'object' || Object.keys(val).length > 0) && (!Array.isArray(val) || val.length > 0);
    return protect(renderTemplate(isTruthy ? truthy : falsy, ctx));
  });

  // 4. {{> partial_key}} — inline a frontmatter string value as-is
  out = out.replace(/\{\{> ?([\w.[\]]+)\}\}/g, (_, path) => {
    const val = resolvePath(ctx, path);
    return val != null ? protect(String(val)) : '';
  });

  // 5. {{key}} — scalar interpolation
  out = out.replace(/\{\{([\w.[\]@]+)\}\}/g, (_, path) => {
    const val = resolvePath(ctx, path);
    if (val == null) return '';
    if (Array.isArray(val)) return protect(val.join(', '));
    if (typeof val === 'object') return protect(JSON.stringify(val));
    return protect(String(val));
  });

  // 6. Restore all protected content
  return restore(out);
}

module.exports = { parse, render, renderTemplate, resolvePath };
