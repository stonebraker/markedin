# .mi — markedin format spec

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

---

## CLI

```sh
node mi.js render <file.mi>   # render to markdown stdout
node mi.js html   <file.mi>   # render to full HTML document stdout
node mi.js data   <file.mi>   # print frontmatter as JSON
node mi.js check  <file.mi>   # validate parse
```

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
