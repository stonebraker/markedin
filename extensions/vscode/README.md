# markedin

Live preview and syntax highlighting for `.mi` files in VS Code and Cursor.

`.mi` is the [markedin](https://agenticsystems.design/markedin/) file format — structured YAML frontmatter with a markdown body that renders from it. One file readable by both agents and humans, with no separate data source or template engine required.

---

## Features

**Live preview** — open any `.mi` file and the rendered output appears in a side panel, updating on every keystroke.

**Syntax highlighting** — YAML in the frontmatter block, Markdown in the body, template expressions called out distinctly:

- `{{key}}`, `{{key.path}}`, `{{array[0]}}` — interpolations
- `{{#each items}}` / `{{#if condition}}` — block helpers
- `{{> partial}}` — partials

---

## Usage

Open a `.mi` file and press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows / Linux).

The preview button also appears in the editor title bar when a `.mi` file is active.

---

## Installation

**From source** — clone the [markedin repo](https://agenticsystems.design/markedin/), open the `extension/` folder in VS Code or Cursor, and press `F5` to launch an Extension Development Host.

**From VSIX** — package with `vsce package` and install via *Extensions → ··· → Install from VSIX*.

---

## The .mi format

```
---
title: My Project
version: "1.0"
items:
  - name: Alpha
    status: stable
  - name: Beta
    status: experimental
---

# {{title}} v{{version}}

{{#each items}}
- **{{name}}** — {{status}}
{{/each}}
```

Full format documentation at [agenticsystems.design/markedin](https://agenticsystems.design/markedin/).

---

## Author

Jason Stonebraker · [agenticsystems.design](https://agenticsystems.design)
