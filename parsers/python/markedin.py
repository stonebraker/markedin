"""
.mi (markedin) parser

Format spec:
  - YAML frontmatter between --- delimiters
  - Markdown body with template expressions:
      {{key}}                        — scalar interpolation
      {{key.nested.path}}            — deep path access
      {{array[0]}}                   — array index access
      {{#each items}}...{{/each}}    — iterate array
      {{#if condition}}...{{/if}}    — conditional block
      {{> partial_key}}              — inline another frontmatter string
"""

SPEC_VERSION = "0.3.0"

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import markdown as md_lib
import yaml


# ─── Frontmatter extraction ─────────────────────────────────────────────────

_EMPTY_FM_RE = re.compile(r"\A---\r?\n---\r?\n?([\s\S]*)\Z")
_FM_RE = re.compile(r"\A---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)\Z")


def parse(source: str) -> Tuple[Dict[str, Any], str]:
    """Parse a .mi source string into (data, body)."""
    m = _EMPTY_FM_RE.match(source)
    if m:
        return {}, m.group(1)

    m = _FM_RE.match(source)
    if not m:
        return {}, source

    data = yaml.safe_load(m.group(1))
    if not isinstance(data, dict):
        data = {}
    return data, m.group(2)


# ─── Path resolution ────────────────────────────────────────────────────────

_ARRAY_IDX_RE = re.compile(r"\[(\d+)\]")


def resolve_path(obj: Any, path: str) -> Any:
    """Resolve a dotted path like 'key.nested[0].field' against obj."""
    path = _ARRAY_IDX_RE.sub(r".\1", path)
    parts = path.split(".")
    cur = obj
    for part in parts:
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(part)
        elif isinstance(cur, list):
            try:
                idx = int(part)
                cur = cur[idx] if 0 <= idx < len(cur) else None
            except (ValueError, IndexError):
                return None
        else:
            return None
    return cur


# ─── Render ──────────────────────────────────────────────────────────────────

def render(source: str, embed: bool = False) -> str:
    """Parse source and return rendered Markdown with expressions resolved.

    If embed is True, append frontmatter as an HTML comment.
    """
    data, body = parse(source)
    out = _render_template(body, data)
    if embed:
        out = (out.rstrip("\n")
               + "\n\n<!-- frontmatter\n"
               + json.dumps(data, indent=2)
               + "\n-->\n")
    return out


def render_html_frag(source: str) -> str:
    """Render source to an HTML fragment (no document wrapper)."""
    markdown = render(source)
    return md_lib.markdown(markdown, extensions=["tables", "pymdownx.tilde", "pymdownx.tasklist", "pymdownx.magiclink"])


def render_html(source: str, embed: bool = False) -> str:
    """Render source to a full HTML document.

    If embed is True, include frontmatter as a JSON script tag in <head>.
    """
    data, body = parse(source)
    markdown = _render_template(body, data)
    html_body = md_lib.markdown(markdown, extensions=["tables"])
    title = data.get("title", "")
    data_block = ""
    if embed:
        data_block = ('\n<script type="application/json" id="frontmatter">\n'
                      + json.dumps(data, indent=2)
                      + '\n</script>')
    return _HTML_TEMPLATE.format(title=title, data_block=data_block, body=html_body)


_HTML_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>{data_block}
<style>
  body {{ max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 1.0625rem; line-height: 1.65; color: #1f2937; }}
  h1, h2, h3 {{ color: #111827; letter-spacing: -.02em; }}
  h1 {{ font-size: 2rem; margin-bottom: .5rem; }}
  h2 {{ font-size: 1.4rem; margin-top: 2.5rem; }}
  h3 {{ font-size: 1.1rem; margin-top: 2rem; }}
  code {{ font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: .875em; background: #f3f4f6; padding: .1em .35em; border-radius: 3px; }}
  pre {{ background: #f3f4f6; border-radius: 6px; padding: 1.25rem; overflow-x: auto; }}
  pre code {{ background: none; padding: 0; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e7eb; }}
  th {{ font-size: .8125rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }}
  a {{ color: #2563eb; }}
  hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }}
</style>
</head>
<body>
{body}
</body>
</html>"""


def _render_template(template: str, ctx: Dict[str, Any]) -> str:
    """Render a template string against a context dict."""
    registry: Dict[str, str] = {}
    seq = [0]

    def protect(s: str) -> str:
        tok = f"\x02{seq[0]}\x03"
        seq[0] += 1
        registry[tok] = s
        return tok

    def restore(s: str) -> str:
        out = s
        for tok in reversed(list(registry.keys())):
            out = out.replace(tok, registry[tok])
        return out

    out = template

    # 0. \{{ → protect as literal {{
    out = re.sub(r"\\\{\{", lambda m: protect("{{"), out)

    # 1. {{#each key}} … {{/each}}
    each_open_re = re.compile(r"\{\{#each ([\w.\[\]]+)\}\}")
    each_nested_re = re.compile(r"\{\{#each [\w.\[\]]+\}\}")
    each_close = "{{/each}}"

    def each_handler(key: str, inner: str) -> str:
        val = resolve_path(ctx, key)
        if not isinstance(val, list):
            return protect("")
        parts = []
        for i, item in enumerate(val):
            item_ctx = dict(ctx)
            item_ctx["this"] = item
            item_ctx["@index"] = i
            item_ctx["@first"] = i == 0
            item_ctx["@last"] = i == len(val) - 1
            if isinstance(item, dict):
                item_ctx.update(item)
            parts.append(_render_template(inner, item_ctx))
        return protect("".join(parts))

    out = _process_blocks(out, each_open_re, each_nested_re, each_close, each_handler)

    # 2. {{#if key}} … {{else}} … {{/if}}
    if_open_re = re.compile(r"\{\{#if ([\w.\[\]]+)\}\}")
    if_nested_re = re.compile(r"\{\{#if [\w.\[\]]+\}\}")
    if_close = "{{/if}}"

    def if_handler(key: str, inner: str) -> str:
        val = resolve_path(ctx, key)
        else_idx = _find_top_level_else(inner)
        if else_idx == -1:
            truthy_branch = inner
            falsy_branch = ""
        else:
            truthy_branch = inner[:else_idx]
            falsy_branch = inner[else_idx + len("{{else}}"):]
        if _is_truthy(val):
            return protect(_render_template(truthy_branch, ctx))
        return protect(_render_template(falsy_branch, ctx))

    out = _process_blocks(out, if_open_re, if_nested_re, if_close, if_handler)

    # 3. {{> partial}}
    def partial_replace(m: re.Match) -> str:
        val = resolve_path(ctx, m.group(1))
        if val is None:
            return ""
        return protect(str(val))

    out = re.sub(r"\{\{> ?([\w.\[\]]+)\}\}", partial_replace, out)

    # 4. {{key}} scalar interpolation
    def scalar_replace(m: re.Match) -> str:
        val = resolve_path(ctx, m.group(1))
        if val is None:
            return ""
        return protect(_format_value(val))

    out = re.sub(r"\{\{([\w.\[\]@]+)\}\}", scalar_replace, out)

    return restore(out)


# ─── Block processing ────────────────────────────────────────────────────────

def _process_blocks(s, open_re, nested_open_re, close_tag, fn):
    """Walk left-to-right, find matching open/close pairs with depth, call fn."""
    result = []
    last_end = 0
    for m in open_re.finditer(s):
        if m.start() < last_end:
            continue
        key = m.group(1)
        open_end = m.end()
        close_idx = _find_close(s, nested_open_re, close_tag, open_end)
        if close_idx == -1:
            continue
        inner = s[open_end:close_idx]
        result.append(s[last_end:m.start()])
        result.append(fn(key, inner))
        last_end = close_idx + len(close_tag)
    result.append(s[last_end:])
    return "".join(result)


def _find_close(s, nested_open_re, close_tag, from_pos):
    """Find the matching close tag at depth 1."""
    depth = 1
    pos = from_pos
    while depth > 0:
        close_idx = s.find(close_tag, pos)
        if close_idx == -1:
            return -1
        segment = s[pos:close_idx]
        depth += len(nested_open_re.findall(segment))
        depth -= 1
        if depth == 0:
            return close_idx
        pos = close_idx + len(close_tag)
    return -1


_IF_ELSE_END_RE = re.compile(
    r"\{\{#if [\w.\[\]]+\}\}|\{\{/if\}\}|\{\{else\}\}"
)


def _find_top_level_else(content: str) -> int:
    """Find {{else}} at the top level (not inside nested #if)."""
    depth = 0
    for m in _IF_ELSE_END_RE.finditer(content):
        tag = m.group()
        if tag.startswith("{{#if "):
            depth += 1
        elif tag == "{{/if}}":
            depth -= 1
        elif tag == "{{else}}" and depth == 0:
            return m.start()
    return -1


def _is_truthy(val: Any) -> bool:
    """Mirror the JS truthiness rules for .mi templates."""
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    if isinstance(val, str):
        return val != ""
    if isinstance(val, list):
        return len(val) > 0
    if isinstance(val, dict):
        return len(val) > 0
    return True


def _format_value(val: Any) -> str:
    """Convert a value to its string representation for interpolation."""
    if isinstance(val, str):
        return val
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        if val == int(val):
            return str(int(val))
        return str(val)
    if isinstance(val, list):
        return ", ".join(str(item) for item in val)
    if isinstance(val, dict):
        return json.dumps(val, separators=(",", ": "))
    return str(val)
