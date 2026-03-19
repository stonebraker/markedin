# markedin

`.mi` is a file format for agentic systems and the humans who work with them.

Structured YAML frontmatter. Markdown body that renders from it. One file — the agent reads the data, the human reads the rendered document.

Full documentation: [markedin.dev](https://markedin.dev/)

---

## Format

```
---
task: Implement rate limiting
status: in_progress
owner: dana
priority: high
notes:
  - Token bucket algorithm chosen over leaky bucket
  - Limit is 100 req/min per API key
---

# {{task}}

**Status:** {{status}} · **Owner:** {{owner}} · **Priority:** {{priority}}

## Notes

{{#each notes}}
- {{this}}
{{/each}}
```

See [SPEC.md](./SPEC.md) for the full format specification.

---

## CLI

```
node mi.js render task.mi       # render to markdown
node mi.js html task.mi         # render to HTML
node mi.js html task.mi --embed # HTML with frontmatter JSON in <head>
node mi.js data task.mi         # extract frontmatter as JSON
node mi.js check task.mi        # validate file
```

---

## Library

```js
const { parse, render } = require("./parse");

const { data, body } = parse(source); // frontmatter data + raw body
const markdown = render(source); // rendered markdown
```

---

## VS Code / Cursor Extension

Live preview and syntax highlighting for `.mi` files.
Repo: [markedin-vscode](https://github.com/stonebraker/markedin-vscode)

Install from source: open the repo in VS Code or Cursor and press `F5`.

Package for distribution: `npm install -g @vscode/vsce && vsce package`.

---

## Author

Jason Stonebraker · [markedin.dev](https://markedin.dev)
