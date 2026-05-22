# Markedin&trade; Specification — the .mi file format

**Spec version: 0.4.3**

`.mi` is a file format that binds a Markdown body to structured data (YAML) through inline template expressions, in one file — the data is the single source of truth; the document is rendered from it. Agents edit the data; humans read the document.

*Markedin* takes its name from **Markdown** — a Markdown file with the data marked in.

A `.mi` file is a plain-text document with two sections:

1. **YAML frontmatter** — structured, machine-readable data
2. **Markdown body** — human-readable prose with template expressions that reference the frontmatter

Values are defined **once** in the frontmatter and rendered into the body without duplication.

---

## File structure

```
---
key: value
nested:
  a: 1
  b: 2
list:
  - item one
  - item two
---

# Markdown body using {{key}} and {{nested.a}} here
```

The frontmatter is full YAML and supports all YAML types: strings, numbers, booleans, nulls, objects, arrays, and nested combinations.

---

## Template expressions

All expressions use `{{ }}` double-brace syntax.

### Scalar interpolation

```
{{key}}
{{nested.path}}
{{array[0]}}
{{array[2].field}}
```

- Arrays render as a comma-separated string when interpolated inline.
- Objects render as JSON when interpolated inline (usually use a nested path instead).

### `{{#each}}`

Iterate over an array:

```
{{#each items}}
- {{name}}: {{description}}
{{/each}}
```

Inside the block, object fields are available directly. **All** name lookups inside an each-block (`{{name}}`, `{{nested.path}}`, `{{#if active}}`, etc.) resolve against the **current iteration item only** — there is no fall-through to an enclosing or root scope, and no explicit root-access syntax (`@root` / `../`) is provided. To use a value from outside the loop, denormalize it onto each item in the frontmatter (or restructure so the reference happens outside the loop).

Additionally:

| Variable | Value |
|----------|-------|
| `{{this}}` | The current item (scalar or object) |
| `{{@index}}` | Current zero-based index |
| `{{@first}}` | `true` for the first item |
| `{{@last}}` | `true` for the last item |

### `{{#if}}`

Conditional blocks:

```
{{#if feature_flag}}
This section only appears when feature_flag is truthy.
{{/if}}
```

With an else branch:

```
{{#if user.admin}}
Admin controls here.
{{else}}
Standard view.
{{/if}}
```

Falsy values: `false`, `0`, `""`, `null`, `undefined`, empty array `[]`, empty object `{}`.

### `{{> partial}}`

Inline another frontmatter value as raw text without escaping:

```
{{> footer_template}}
```

Useful for reusable prose snippets stored in the frontmatter.

### Standalone tag stripping

When a block tag (`{{#each}}`, `{{/each}}`, `{{#if}}`, `{{/if}}`, `{{else}}`) is the only non-whitespace content on its line, the entire line — including the trailing newline — is consumed and produces no output. This prevents block tags from introducing blank lines that would break Markdown constructs like tables.

```
| Name | Role |
|------|------|
{{#each team}}
| {{name}} | {{role}} |
{{/each}}
```

The `{{#each}}` and `{{/each}}` lines are stripped, producing a valid table:

```
| Name | Role |
|------|------|
| Alice | eng |
| Bob | pm |
```

A tag that shares its line with other non-whitespace content is **not** standalone and is left in place:

```
items: {{#each items}}{{this}}, {{/each}}
```

### Escaping

Prefix `{{` with a backslash to render it literally:

```
\{{key}} renders as {{key}}
\{{#each items}} renders as {{#each items}}
```

The backslash is consumed — only the `{{ }}` expression appears in the output. This is useful for documenting markedin syntax within a `.mi` file.

---

## Markdown rendering

After template expressions are resolved, the body is rendered as Markdown. Parsers must support GitHub Flavored Markdown (GFM), which includes:

- **Tables** — pipe-delimited table syntax
- **Strikethrough** — `~~text~~` renders as struck-through text
- **Autolinks** — bare URLs become clickable links
- **Task lists** — `- [x]` and `- [ ]` render as checkboxes

### HTML safety

Template substitution is **raw** — `{{key}}` inserts the scalar value into the markdown body without HTML escaping. HTML safety is a property of the **HTML render step** (`renderHtmlFrag` / `renderHtml`): any raw HTML present in the body markdown (whether authored directly or substituted from a YAML value) is neutralized at HTML-render time so it cannot be parsed as live markup by a browser.

How each reference parser neutralizes raw HTML is determined by the markdown library it uses:

- **Go** (`goldmark`): strips raw HTML and replaces it with a `<!-- raw HTML omitted -->` comment.
- **JS** (`marked`): escapes raw HTML to entities (`<title>` → `&lt;title&gt;`), so the element name renders as visible text.
- **Python** (`python-markdown`): escapes raw HTML to entities, matching JS.

Parsers must be **safe** (no raw `<title>`, `<script>`, or other elements reach the HTML output) but the *presentation* of stripped/escaped HTML can differ across parsers. Cross-parser equivalence is byte-identical at the `render()` (markdown) level only; at the `renderHtmlFrag` (HTML) level, output is safe per parser but may differ in formatting.

To intentionally embed trusted HTML from a frontmatter value, use `{{> key}}` — the raw partial form bypasses the markdown body and is not subject to renderer-level escaping.

---

## Use cases

| Use case | What lives in frontmatter | What the body adds |
|----------|--------------------------|-------------------|
| API docs | endpoint, method, params, responses | prose context, examples |
| Design system | components, versions, owners, stats | narrative, install guide |
| Product spec | features, owners, milestones | rationale, decisions |
| Config docs | env vars, defaults, types | usage explanation |
| Release notes | version, date, items | tone, context |
| Runbook | services, steps, escalation | procedure, context |

---

## Changelog

### 0.4.3 — HTML safety at the render layer; `{{#each}}` scope clarified

- **HTML safety moved to render time.** `{{key}}` substitution is raw; raw HTML (whether authored in the body or substituted from a YAML value) is neutralized by the markdown renderer at `renderHtmlFrag` / `renderHtml`. Goldmark strips with a comment; marked and python-markdown escape to entities. The substitution-time escape from 0.4.2 caused a double-escape bug inside fenced code blocks (`{"id":"…"}` → `{&quot;id&quot;:&quot;…&quot;}` → `{&amp;quot;id…}`) and has been removed.
- **`{{#each}}` scope clarified.** Unqualified name lookups inside an each-block resolve against the current iteration item only; no fall-through to an outer or root scope. No explicit root-access syntax. (Carried forward from 0.4.2 — that part of 0.4.2 was correct.)
- **Cross-parser equivalence** is explicitly at the `render()` markdown level. HTML output is safe per parser but presentation can differ across parsers.

### 0.4.2 — superseded

Published to npm only; deprecated. The substitution-time HTML escape it introduced was at the wrong layer and broke fenced-code-block interpolation. Replaced by 0.4.3.
