# markedin

Markedin (`.mi`) is a file format for both machines and humans. 🤝 Structured data in the frontmatter, readable prose in the rendered body. No framework required.

Full documentation: [markedin.dev](https://markedin.dev/)

---

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

See [SPEC.md](./SPEC.md) for the full format specification.

## Template Expressions

| Expression                         | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `{{key}}`                          | Scalar value (arrays render comma-separated) |
| `{{key.nested}}`                   | Dot-path into objects                        |
| `{{array[0]}}`                     | Array index access                           |
| `{{#each items}}...{{/each}}`      | Iterate an array                             |
| `{{#if key}}...{{else}}...{{/if}}` | Conditional block                            |
| `{{> key}}`                        | Inline a frontmatter string as raw text      |

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
