# Skill: write-mi

Write well-formed `.mi` files.

## What is a .mi file

A `.mi` file has two sections:

1. **YAML frontmatter** between `---` delimiters — structured data, the single source of truth for all values in the document
2. **Markdown body** — human-readable prose that renders from the frontmatter using `{{ }}` template expressions

Values are defined once in the frontmatter and referenced in the body. They are never repeated as prose.

## File structure

```
---
key: value
nested:
  field: value
list:
  - item one
  - item two
---

# {{key}}

Body prose using {{nested.field}} and list items:

{{#each list}}
- {{this}}
{{/each}}
```

## Template expressions

| Expression | Resolves to |
|---|---|
| `{{key}}` | Scalar value substituted **raw** into the markdown body. Arrays render comma-separated inline. |
| `{{key.nested}}` | Dot-path into an object. |
| `{{array[0]}}` | Array index. Bracket and dot notation both work. |
| `{{#each items}} … {{/each}}` | Iterate an array. Object fields available directly. Lookups inside resolve against the **current iteration item only** — no fall-through to outer/root scope. `{{@index}}`, `{{@first}}`, `{{@last}}` available. |
| `{{#if key}} … {{else}} … {{/if}}` | Conditional block. Falsy: `false`, `0`, `""`, `null`, `[]`, `{}`. Subject to the same iteration-scope rule when used inside `{{#each}}`. |
| `{{> key}}` | Inline a frontmatter string value as raw text. Same raw substitution as `{{key}}`. |
| `\{{key}}` | Render `{{key}}` literally (escape). |

## Rules

- Every value that appears in the body must be defined in the frontmatter.
- Do not duplicate content. If a value is in the frontmatter, reference it with `{{key}}` — do not restate it as prose.
- Frontmatter holds data, not narrative. Strings, numbers, booleans, arrays, objects — not sentences.
- Use the narrowest correct YAML type. Versions and IDs that look like numbers should be quoted strings.
- Prefer `{{#each}}` over manually listing items that already exist as an array.
- The rendered body should read as natural prose or structured documentation, not as a data dump.
- Design the frontmatter for the agent that will read and write it, and the body for the human who will read it.

## What belongs in frontmatter

Structured data: names, versions, statuses, dates, URLs, flags, arrays of items, nested objects. Not sentences. Not explanatory prose. Not content that only makes sense in context.

## What belongs in the body

Everything a human needs to read the document: headings, prose, lists, tables, code examples. Use template expressions to pull values from frontmatter rather than restating them.

## Common pitfalls

### HTML element names in YAML values

Template substitution is **raw** — `{{key}}` inserts the YAML value verbatim into the markdown body. HTML safety is the markdown renderer's responsibility at HTML-render time, not the template engine's: when `renderHtmlFrag` / `renderHtml` produces HTML output, raw HTML in the body (whether authored directly or substituted from a value) is neutralized — escaped to entities by the JS and Python parsers, stripped with a comment by the Go parser.

That means writing `<title>` in a YAML value is safe by default — it can't hijack browser HTML parsing the way it would if it were passed through unescaped. But for clearer source and cleaner output, wrap HTML element names in backticks so they render as inline code:

```
---
role: "Document `<title>` for the page."   # preferred — renders as <code>&lt;title&gt;</code>
note: "Document <title> for the page."     # also safe — renders escaped or stripped
---

- **Role:** {{role}}
- **Note:** {{note}}
```

### Globals inside `{{#each}}`

Lookups inside an iteration block resolve against the *current item* only. There is no fall-through to enclosing or root scope, and no explicit root-access syntax. To use a global value inside a loop, denormalize it onto each item, or restructure outside the loop.

```
# Wrong — `theme` is not on the item; renders empty
---
theme: dark
items:
  - id: a
  - id: b
---

{{#each items}}
- {{id}} (theme: {{theme}})
{{/each}}

# Right — denormalize, or restructure
---
items:
  - id: a
    theme: dark
  - id: b
    theme: dark
---

{{#each items}}
- {{id}} (theme: {{theme}})
{{/each}}
```

## Testing convention

When authoring tests for substitution or rendering behavior, **default to asserting on `renderHtmlFrag()` (or `RenderHTMLFrag` / `render_html_frag`) output, not `render()`**. The HTML render step is the user-visible surface; bugs that only manifest after the markdown→HTML pipeline (the kind that ship to browsers and previews) won't be caught by tests that stop at `render()`. Use `render()`-only tests for behavior that's specifically about the markdown intermediate form.

## Example

```
---
task: Implement rate limiting
status: in_progress
owner: dana
priority: high
notes:
  - Token bucket algorithm chosen over leaky bucket
  - Limit is 100 req/min per API key
  - Redis required for distributed enforcement
---

# {{task}}

**Status:** {{status}} · **Owner:** {{owner}} · **Priority:** {{priority}}

## Notes

{{#each notes}}
- {{this}}
{{/each}}
```

An agent updates `status` or appends to `notes` by writing to the frontmatter. The rendered body reflects the change immediately. No template to maintain, no separate document to sync.
