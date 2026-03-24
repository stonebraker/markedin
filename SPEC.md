# .mi — markedin format spec

**Spec version: 0.4.0**

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

Inside the block, object fields are available directly. Additionally:

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

---

## Use cases

| Use case | What lives in frontmatter | What the body adds |
|----------|--------------------------|-------------------|
| API docs | endpoint, method, params, responses | prose context, examples |
| Design system | components, versions, owners, stats | narrative, install guide |
| Product spec | features, owners, milestones | rationale, decisions |
| Config docs | env vars, defaults, types | usage explanation |
| Release notes | version, date, items | tone, context |
| Resume / profile | skills, experience, contact | narrative bio |
