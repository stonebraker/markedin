# Markedin&trade;

Markedin is a suite of tools for working with `.mi` files: one file where an agent reads and writes structured data (YAML) and the human-readable document (Markdown) renders from it — no separate data file, no sync problem, no framework required.

`.mi` is a file format that binds a Markdown body to structured data (YAML) through inline template expressions, in one file — the data is the single source of truth; the document is rendered from it. Agents edit the data; humans read the document.

*Markedin* takes its name from **Markdown** — a Markdown file with the data marked in.

Explore: [markedin.dev](https://markedin.dev/)

---

## The .mi Format

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

See [SPEC.md](./SPEC.md) for the full format specification and [how Markedin compares](./docs/comparison.md) to similar tools.

## Template Expressions

| Expression                         | Description                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| `{{key}}`                          | Scalar value substituted raw (arrays render comma-separated) |
| `{{key.nested}}`                   | Dot-path into objects                                      |
| `{{array[0]}}`                     | Array index access                                         |
| `{{#each items}}...{{/each}}`      | Iterate an array (lookups scoped to the current item)      |
| `{{#if key}}...{{else}}...{{/if}}` | Conditional block                                          |
| `{{> key}}`                        | Inline a frontmatter string as raw text                    |
| `\{{key}}`                         | Render `{{key}}` literally (escape)                        |

Template substitution is raw — substituted values are inserted verbatim into the markdown body. HTML safety is handled at HTML render time: raw HTML in the body (whether authored or substituted) is neutralized by the markdown renderer — escaped to entities by the JS and Python parsers, stripped with a comment by the Go parser. Code-block contents are unaffected (they go through the markdown renderer's standard code-block escaping, which the browser displays back as the original characters). See [`SPEC.md`](./SPEC.md) for full semantics.

---

## Parsers

All three parsers have the same API: `parse`, `render`, `renderHtmlFrag`, `renderHtml`, and `resolvePath`.

### Node

```
npm install markedin-parser
```

```javascript
const fs = require("fs");
const { parse, render, renderHtmlFrag, renderHtml } = require("markedin-parser");

const source = fs.readFileSync("task.mi", "utf8");

const { data, body } = parse(source);   // extract frontmatter and body
render(source);                          // rendered markdown
renderHtmlFrag(source);                  // HTML fragment
renderHtml(source);                      // full HTML document
render(source, { embed: true });         // markdown with frontmatter comment
renderHtml(source, { embed: true });     // HTML with frontmatter <script> tag
```

### Go

```
go get github.com/stonebraker/markedin/parsers/go
```

```go
import markedin "github.com/stonebraker/markedin/parsers/go"

doc, _ := markedin.Parse(source)             // doc.Data, doc.Body
md, _ := markedin.Render(source)             // rendered markdown
html, _ := markedin.RenderHTMLFrag(source)   // HTML fragment
html, _ := markedin.RenderHTML(source)       // full HTML document
md, _ := markedin.Render(source, markedin.WithEmbed())    // markdown with frontmatter comment
html, _ := markedin.RenderHTML(source, markedin.WithEmbed()) // HTML with frontmatter <script> tag
```

### Python

```python
import markedin

data, body = markedin.parse(source)          # extract frontmatter and body
md = markedin.render(source)                 # rendered markdown
html = markedin.render_html_frag(source)     # HTML fragment
html = markedin.render_html(source)          # full HTML document
md = markedin.render(source, embed=True)     # markdown with frontmatter comment
html = markedin.render_html(source, embed=True)  # HTML with frontmatter <script> tag
```

---

## CLI

```
go build -o mi ./cli
```

```
mi task.mi                  # render to markdown (default)
mi task.mi --html           # full HTML document
mi task.mi --html-frag      # HTML fragment
mi task.mi --json           # frontmatter as JSON
mi task.mi --yaml           # frontmatter as YAML
mi task.mi --embed          # include frontmatter in output
mi task.mi -o out.html      # write to file
mi check task.mi            # validate file
```

---

## Extensions

### VS Code / Cursor

Live preview and syntax highlighting for `.mi` files. See [extensions/vscode](./extensions/vscode/).

### Chrome / Firefox

Render `.mi` files directly in the browser. See [extensions/chrome](./extensions/chrome/) and [extensions/firefox](./extensions/firefox/).

---

## Agent Skills

Skills in `skills/` teach agents how to work with `.mi` files:

- [**write-mi**](./skills/write-mi.md) — Author well-formed `.mi` files with correct frontmatter/body structure
- [**use-mi**](./skills/use-mi.md) — Parse, render, and extract data from `.mi` files using the parser libraries and CLI

---

## Author

Jason Stonebraker · [markedin.dev](https://markedin.dev)

## License

Apache 2.0

## Trademark

Markedin is a trademark of Jason Stonebraker. The Apache 2.0 license covers the
code; it does not grant rights to the Markedin name or brand. See
[TRADEMARK.md](./TRADEMARK.md) for permitted uses.

---

Created and developed by Jason Stonebraker. Built with Claude Opus 4.6.
