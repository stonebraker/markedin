# Skill: write-mi

Write well-formed `.mi` (markedin) files.

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
| `{{key}}` | Scalar value. Arrays render comma-separated inline. |
| `{{key.nested}}` | Dot-path into an object. |
| `{{array[0]}}` | Array index. Bracket and dot notation both work. |
| `{{#each items}} … {{/each}}` | Iterate an array. Object fields available directly. `{{@index}}`, `{{@first}}`, `{{@last}}` available inside the block. |
| `{{#if key}} … {{else}} … {{/if}}` | Conditional block. Falsy: `false`, `0`, `""`, `null`, `[]`, `{}`. |
| `{{> key}}` | Inline a frontmatter string value as raw text. |
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
