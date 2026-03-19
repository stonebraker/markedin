# Test suite notes

## Parser

**Common**
- File with valid frontmatter and body parses correctly
- Frontmatter values accessible by key
- Body returned verbatim before rendering
- File with no frontmatter returns empty data and full source as body
- CRLF line endings handled

**Edge cases**
- Empty frontmatter block (`---\n---`)
- Empty body
- Completely empty file
- Frontmatter only, no body
- Body only, no frontmatter delimiters
- `---` appearing in the body (must not be treated as closing delimiter)
- Frontmatter with YAML that evaluates to null

---

## Scalar interpolation `{{key}}`

**Common**
- String value renders correctly
- Number value renders as string
- Boolean value renders as string
- Deep path `{{a.b.c}}` resolves correctly
- Array index `{{items[0]}}` resolves correctly
- Mixed path `{{items[1].name}}` resolves correctly

**Edge cases**
- Key not present in frontmatter → empty string, no error
- Key present but value is null → empty string
- Key present but value is `false` or `0` → renders `false` / `0`, not empty
- Inline array `{{tags}}` → comma-separated string
- Inline object `{{meta}}` → JSON string
- `{{@index}}`, `{{@first}}`, `{{@last}}` outside of `#each` → empty string, no error

---

## `{{#each}}`

**Common**
- Iterates array of scalars, `{{this}}` resolves each item
- Iterates array of objects, fields available directly as `{{name}}`, `{{status}}` etc.
- `{{@index}}` is zero-based
- `{{@first}}` is true only for first item
- `{{@last}}` is true only for last item
- Empty array produces no output

**Advanced**
- Nested `{{#each}}` — outer and inner arrays, inner fields do not bleed into outer context
- `{{#each}}` over an array of arrays — `{{this}}` is itself an array
- Field in inner context shadows same-named field in outer context
- `{{#each}}` with `{{#if}}` inside
- `{{#if}}` with `{{#each}}` inside

**Edge cases**
- Path resolves to a non-array scalar → no output, no error
- Path resolves to an object (not array) → no output, no error
- Path not found → no output, no error
- Array of nulls — `{{this}}` renders empty string per item
- Single-item array — `{{@first}}` and `{{@last}}` both true

---

## `{{#if}}`

**Common**
- Truthy string renders the truthy branch
- Falsy values (`false`, `0`, `""`, `null`) render the falsy branch or nothing
- `{{else}}` branch renders when condition is falsy
- No `{{else}}` and falsy condition → no output

**Edge cases**
- Empty array `[]` is falsy
- Empty object `{}` is falsy
- Non-empty array is truthy
- Non-empty object is truthy
- Nested `{{#if}}` inside `{{#if}}`
- Path not found → falsy

---

## `{{> partial}}`

**Common**
- Inlines a frontmatter string value verbatim
- Value is not re-rendered as a template (no double-evaluation)

**Edge cases**
- Key not found → empty string
- Value contains `{{expressions}}` — must appear literally in output, not be re-evaluated

---

## Double-evaluation protection

These cases are the reason protected rendering exists and must be tested explicitly.

- A frontmatter string value that contains `{{key}}` — when referenced via `{{field}}` or `{{> field}}`, the `{{key}}` must appear literally in output
- An array item whose string value contains `{{expr}}` — must appear literally when rendered via `{{#each}}`
- A code fence in the body containing `{{expr}}` — must be preserved verbatim
- An inline code span containing `{{expr}}` — must be preserved verbatim

---

## `render()` end-to-end

**Common**
- Rendered output contains no `---` frontmatter block
- All `{{ }}` expressions resolved
- Plain markdown outside expressions passed through unchanged

**Advanced**
- Large frontmatter with multiple types, nested structures, arrays of objects
- Template that references every expression type in one file
- Chained dot-paths four levels deep

**Edge cases**
- Body with no template expressions → returned unchanged
- Expression referencing a key whose value is another YAML type each time (string, number, bool, array, object, null)
- Unicode in frontmatter values and body

---

## CLI

- `render` exits 0 and outputs markdown
- `html` exits 0 and outputs a valid HTML document
- `html --embed` includes `<script type="application/json" id="frontmatter">` in `<head>` with correct JSON
- `html` without `--embed` contains no `id="frontmatter"` script tag
- `data` exits 0 and outputs valid JSON matching frontmatter
- `check` exits 0 for valid file, prints key count and body line count
- `check` exits non-zero for invalid YAML frontmatter
- Missing file argument exits non-zero with usage message
- Non-existent file path exits non-zero with error message
- Unknown command exits non-zero with usage message
