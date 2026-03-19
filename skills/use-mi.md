# Skill: use-mi

Use the markedin parsers to read, render, and manipulate `.mi` files programmatically.

## Parsers

Three parser implementations exist, all with the same behavior:

| Language | Location | Import |
|---|---|---|
| Go | `parsers/go/` | `github.com/agenticsystems/markedin/parsers/go` |
| Python | `parsers/python/markedin.py` | `import markedin` |
| Node | `parsers/js/parse.js` | `require('./parse')` |

A Go CLI is also available at `cli/main.go` (`mi` binary).

## API surface

All three parsers expose the same core functions. Signatures shown per language.

### parse

Extract frontmatter data and body from a `.mi` source string. Does not resolve template expressions.

```go
doc, err := markedin.Parse(source)    // doc.Data (map[string]any), doc.Body (string)
```

```python
data, body = markedin.parse(source)   # data (dict), body (str)
```

```javascript
const { data, body } = parse(source)  // data (object), body (string)
```

### render

Parse and resolve all template expressions. Returns rendered Markdown.

```go
md, err := markedin.Render(source)
md, err := markedin.Render(source, markedin.WithEmbed())  // appends frontmatter as HTML comment
```

```python
md = markedin.render(source)
md = markedin.render(source, embed=True)
```

```javascript
const md = render(source)
const md = render(source, { embed: true })
```

### render_html_frag

Render to an HTML fragment — no `<html>`, `<head>`, or `<body>` wrapper.

```go
html, err := markedin.RenderHTMLFrag(source)
```

```python
html = markedin.render_html_frag(source)
```

```javascript
const html = renderHtmlFrag(source)
```

### render_html

Render to a full HTML document with styles.

```go
html, err := markedin.RenderHTML(source)
html, err := markedin.RenderHTML(source, markedin.WithEmbed())  // adds frontmatter as <script> in <head>
```

```python
html = markedin.render_html(source)
html = markedin.render_html(source, embed=True)
```

```javascript
const html = renderHtml(source)
const html = renderHtml(source, { embed: true })
```

### resolve_path

Resolve a dotted/bracketed path against a data object. Useful for extracting specific values from parsed frontmatter.

```go
val := markedin.ResolvePath(doc.Data, "items[0].name")  // not exported; use doc.Data directly
```

```python
val = markedin.resolve_path(data, "items[0].name")
```

```javascript
const val = resolvePath(data, "items[0].name")
```

## CLI

```
mi <file.mi> [--md|--html|--html-frag|--json|--yaml] [--embed] [-o <file>]
mi check <file.mi>
```

| Flag | Output |
|---|---|
| `--md` (default) | Rendered Markdown |
| `--html` | Full HTML document with styles |
| `--html-frag` | HTML fragment (body only) |
| `--json` | Frontmatter as JSON |
| `--yaml` | Frontmatter as YAML |
| `--embed` | Include frontmatter in output (HTML comment for `--md`, `<script>` tag for `--html`) |
| `-o <file>` | Write to file instead of stdout |

## Common patterns

### Read a field from frontmatter

```python
data, body = markedin.parse(open("task.mi").read())
print(data["status"])  # "in_progress"
```

### Update frontmatter

The parsers are read-only — they parse and render but do not write. To update a `.mi` file, edit the frontmatter YAML directly using file editing tools. Do not round-trip through parse and re-serialize — this destroys formatting, comments, and key ordering.

### Render to HTML for preview

```python
html = markedin.render_html(open("task.mi").read())
open("preview.html", "w").write(html)
```

### Extract structured data for automation

```python
import glob

for path in glob.glob("tasks/*.mi"):
    data, _ = markedin.parse(open(path).read())
    if data.get("status") == "blocked":
        print(f"{path}: blocked on {data.get('blocked_by', 'unknown')}")
```

## Browser extensions

Browser extensions for Chrome (`extensions/chrome/`) and Firefox (`extensions/firefox/`) let humans view `.mi` files as rendered pages directly in the browser. These are end-user tools — agents should use the parser libraries or CLI instead.
