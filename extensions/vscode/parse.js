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
    // Reverse insertion order: a token whose value contains an earlier token
    // (lower seq) unwraps correctly when the later token (higher seq) resolves
    // first, exposing the earlier token for the next iteration.
    let out = str;
    for (const [tok, val] of [...registry.entries()].reverse()) {
      out = out.split(tok).join(val);
    }
    return out;
  }

  // Find the closing tag that matches the opening at depth 1, accounting for
  // nested same-type opens. Returns index of the closing tag, or -1.
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

  // Find {{else}} that sits at the top level of content (not inside a nested
  // #if block). Returns its index, or -1 if absent.
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

  // Standalone tag detection
  function isStandalone(s, tagStart, tagEnd) {
    let lineStart = tagStart;
    while (lineStart > 0 && s[lineStart - 1] !== '\n') lineStart--;
    for (let i = lineStart; i < tagStart; i++) {
      if (s[i] !== ' ' && s[i] !== '\t') return null;
    }
    let pos = tagEnd;
    while (pos < s.length && s[pos] !== '\n' && s[pos] !== '\r') {
      if (s[pos] !== ' ' && s[pos] !== '\t') return null;
      pos++;
    }
    if (pos < s.length && s[pos] === '\r') pos++;
    if (pos < s.length && s[pos] === '\n') pos++;
    return { lineStart, lineEnd: pos };
  }

  // 1. Template expressions interpolate everywhere — including inside fenced
  // code blocks and inline code spans. The STX/ETX token mechanism already
  // prevents double-evaluation of resolved values, so no upfront protection
  // of code blocks is needed.
  let out = template;

  // \{{ → protect as literal {{
  out = out.replace(/\\\{\{/g, () => protect('{{'));

  // 2. {{#each key}} ... {{/each}}
  // Walk left-to-right; use depth counting to find each opening tag's true
  // matching close, so nested #each blocks are passed intact to the inner
  // renderTemplate call where they execute in the correct item context.
  {
    const openRe = /\{\{#each ([\w.[\]]+)\}\}/g;
    const nestedOpenRe = /\{\{#each [\w.[\]]+\}\}/g;
    const closeTag = '{{/each}}';
    let result = '';
    let lastEnd = 0;
    let m;
    while ((m = openRe.exec(out)) !== null) {
      const openStart = m.index;
      const openEnd = m.index + m[0].length;
      const closeIdx = findClose(out, nestedOpenRe, closeTag, openEnd);
      if (closeIdx === -1) continue;
      const closeEnd = closeIdx + closeTag.length;

      let consumeFrom = openStart;
      let consumeTo = closeEnd;
      let innerStart = openEnd;
      let innerEnd = closeIdx;

      const openSA = isStandalone(out, openStart, openEnd);
      if (openSA) { consumeFrom = openSA.lineStart; innerStart = openSA.lineEnd; }

      const closeSA = isStandalone(out, closeIdx, closeEnd);
      if (closeSA) { consumeTo = closeSA.lineEnd; }

      const inner = out.slice(innerStart, innerEnd);
      result += out.slice(lastEnd, consumeFrom);
      const arr = resolvePath(ctx, m[1]);
      if (!Array.isArray(arr)) {
        result += protect('');
      } else {
        result += protect(arr.map((item, i) => {
          const itemCtx = { ...ctx, this: item, '@index': i, '@first': i === 0, '@last': i === arr.length - 1 };
          if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(itemCtx, item);
          return renderTemplate(inner, itemCtx);
        }).join(''));
      }
      lastEnd = consumeTo;
      openRe.lastIndex = lastEnd;
    }
    out = result + out.slice(lastEnd);
  }

  // 3. {{#if key}} ... {{else}} ... {{/if}}
  // Same depth-counting approach; {{else}} is located at the top level of the
  // captured inner content so nested #if/else pairs are handled correctly.
  {
    const openRe = /\{\{#if ([\w.[\]]+)\}\}/g;
    const nestedOpenRe = /\{\{#if [\w.[\]]+\}\}/g;
    const closeTag = '{{/if}}';
    let result = '';
    let lastEnd = 0;
    let m;
    while ((m = openRe.exec(out)) !== null) {
      const openStart = m.index;
      const openEnd = m.index + m[0].length;
      const closeIdx = findClose(out, nestedOpenRe, closeTag, openEnd);
      if (closeIdx === -1) continue;
      const closeEnd = closeIdx + closeTag.length;

      let consumeFrom = openStart;
      let consumeTo = closeEnd;
      let innerStart = openEnd;
      let innerEnd = closeIdx;

      const openSA = isStandalone(out, openStart, openEnd);
      if (openSA) { consumeFrom = openSA.lineStart; innerStart = openSA.lineEnd; }

      const closeSA = isStandalone(out, closeIdx, closeEnd);
      if (closeSA) { consumeTo = closeSA.lineEnd; }

      const inner = out.slice(innerStart, innerEnd);
      const elseIdx = findTopLevelElse(inner);
      let truthy, falsy;
      if (elseIdx === -1) {
        truthy = inner; falsy = '';
      } else {
        const elseEnd = elseIdx + '{{else}}'.length;
        const elseSA = isStandalone(inner, elseIdx, elseEnd);
        if (elseSA) {
          truthy = inner.slice(0, elseSA.lineStart);
          falsy = inner.slice(elseSA.lineEnd);
        } else {
          truthy = inner.slice(0, elseIdx);
          falsy = inner.slice(elseEnd);
        }
      }
      result += out.slice(lastEnd, consumeFrom);
      const val = resolvePath(ctx, m[1]);
      const isTruthy = val && (typeof val !== 'object' || Object.keys(val).length > 0) && (!Array.isArray(val) || val.length > 0);
      result += protect(renderTemplate(isTruthy ? truthy : falsy, ctx));
      lastEnd = consumeTo;
      openRe.lastIndex = lastEnd;
    }
    out = result + out.slice(lastEnd);
  }

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
