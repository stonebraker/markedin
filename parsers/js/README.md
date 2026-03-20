# markedin-parser

Markedin (`.mi`) is a file format for both machines and humans. YAML frontmatter + templated Markdown.

`markedin-parser` parses and renders `.mi` (markedin) files. No framework required. Perfect for file-based agentic systems.

Full documentation at [markedin.dev](https://markedin.dev)

## Install

```
npm install markedin-parser
```

## Markedin .mi Format

A `.mi` file has YAML frontmatter between `---` delimiters and a Markdown body that renders from it.

`task.mi`:

```
---
task: Implement rate limiting
status: in_progress
owner:
  name: Dana
  team: Platform
priority: high
notes:
  - Token bucket algorithm chosen over leaky bucket
  - Limit is 100 req/min per API key
  - Redis required for distributed enforcement
blocked: false
---

# {{task}}

**Status:** {{status}} · **Owner:** {{owner.name}} ({{owner.team}}) · **Priority:** {{priority}}

First note: {{notes[0]}}

## Notes

{{#each notes}}
- {{this}}
{{/each}}

{{#if blocked}}
⚠️ This task is currently blocked.
{{else}}
✅ No blockers.
{{/if}}
```

## Template Expressions

| Expression                         | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `{{key}}`                          | Scalar value (arrays render comma-separated) |
| `{{key.nested}}`                   | Dot-path into objects                        |
| `{{array[0]}}`                     | Array index access                           |
| `{{#each items}}...{{/each}}`      | Iterate an array                             |
| `{{#if key}}...{{else}}...{{/if}}` | Conditional block                            |
| `{{> key}}`                        | Inline a frontmatter string as raw text      |

## Parsing and Rendering a Markedin File

```javascript
const fs = require("fs");
const {
    parse,
    render,
    renderHtmlFrag,
    renderHtml,
} = require("markedin-parser");

const source = fs.readFileSync("task.mi", "utf8");

// Extract frontmatter and body
const { data, body } = parse(source);
// data → { task: 'Implement rate limiting', status: 'in_progress', owner: { name: 'Dana', ... }, ... }

// Render to markdown (template expressions resolved)
render(source);

// Render to HTML fragment
renderHtmlFrag(source);

// Render to full HTML document with styles
renderHtml(source);

// Embed frontmatter in output
render(source, { embed: true }); // appends as HTML comment
renderHtml(source, { embed: true }); // adds <script> tag in <head>
```

## Markedin Parser API

### `parse(source)` → `{ data, body }`

Extract YAML frontmatter and body. Does not resolve template expressions.

### `render(source, options?)` → `string`

Resolve all template expressions and return rendered Markdown.

Options: `{ embed: true }` appends frontmatter as an HTML comment.

### `renderHtmlFrag(source)` → `string`

Render to an HTML fragment — no document wrapper.

### `renderHtml(source, options?)` → `string`

Render to a full HTML document with styles.

Options: `{ embed: true }` includes frontmatter as a `<script type="application/json">` tag in `<head>`.

### `resolvePath(data, path)` → `any`

Resolve a dotted/bracketed path against a data object.

```javascript
resolvePath(data, "owner.name"); // → 'Dana'
resolvePath(data, "notes[0]"); // → 'Token bucket algorithm chosen over leaky bucket'
```

## License

Apache 2.0
