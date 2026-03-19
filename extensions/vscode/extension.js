'use strict';

const vscode = require('vscode');
const path   = require('path');
const { parse, render } = require('./parse');
const { marked } = require('marked');

// ─── Preview panel ─────────────────────────────────────────────────────────

class MiPreviewPanel {
  static current = undefined;
  static viewType = 'markedinPreview';

  static createOrShow(extensionUri, document) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn + 1
      : vscode.ViewColumn.Two;

    if (MiPreviewPanel.current) {
      MiPreviewPanel.current.panel.reveal(column);
      MiPreviewPanel.current._update(document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MiPreviewPanel.viewType,
      'Preview',
      column,
      { enableScripts: false }
    );

    MiPreviewPanel.current = new MiPreviewPanel(panel, extensionUri);
    MiPreviewPanel.current._update(document);
  }

  static update(document) {
    if (MiPreviewPanel.current) {
      MiPreviewPanel.current._update(document);
    }
  }

  constructor(panel, extensionUri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => {
      MiPreviewPanel.current = undefined;
    });
  }

  _update(document) {
    const source = document.getText();
    const name   = path.basename(document.fileName, '.mi');
    this.panel.title = `${name} — preview`;
    this.panel.webview.html = this._render(source);
  }

  _render(source) {
    let data = {};
    let html = '';

    try {
      const parsed   = parse(source);
      data           = parsed.data;
      const markdown = render(source);
      html           = marked.parse(markdown);
    } catch (e) {
      html = `<pre style="color:#dc2626;padding:1rem">${e.message}</pre>`;
    }

    const title = data.title || 'Preview';

    return /* html */`<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    max-width: 740px;
    margin: 0 auto;
    padding: 3rem 1.75rem 5rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 1.0625rem;
    line-height: 1.7;
    color: var(--vscode-editor-foreground, #1f2937);
    background: var(--vscode-editor-background, #fff);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 {
    letter-spacing: -.02em;
    line-height: 1.25;
    margin-top: 2.25rem;
    margin-bottom: .5rem;
    color: var(--vscode-editor-foreground, #111827);
    font-weight: 600;
  }
  h1 { font-size: 2rem; margin-top: 0; }
  h2 { font-size: 1.35rem; margin-top: 2.5rem; padding-bottom: .4rem; border-bottom: 1px solid var(--vscode-panel-border, #e5e7eb); }
  h3 { font-size: 1.1rem; }
  h4 { font-size: 1rem; }
  p  { margin-bottom: 1rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
  li { margin-bottom: .25rem; }
  code {
    font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
    font-size: .875em;
    background: var(--vscode-textBlockQuote-background, #f3f4f6);
    color: var(--vscode-textPreformat-foreground, #2563eb);
    padding: .1em .35em;
    border-radius: 3px;
  }
  pre {
    background: var(--vscode-textBlockQuote-background, #f3f4f6);
    border-radius: 6px;
    padding: 1.25rem;
    overflow-x: auto;
    margin-bottom: 1.25rem;
    font-size: .9rem;
    line-height: 1.6;
  }
  pre code { background: none; padding: 0; color: inherit; }
  blockquote {
    border-left: 3px solid var(--vscode-panel-border, #d1d5db);
    padding: .5rem 1rem;
    color: var(--vscode-descriptionForeground, #6b7280);
    margin-bottom: 1rem;
  }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1.25rem; font-size: .9375rem; }
  th {
    text-align: left;
    padding: .5rem .75rem;
    font-size: .8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--vscode-descriptionForeground, #6b7280);
    border-bottom: 2px solid var(--vscode-panel-border, #e5e7eb);
  }
  td { padding: .5rem .75rem; border-bottom: 1px solid var(--vscode-panel-border, #f3f4f6); }
  a { color: var(--vscode-textLink-foreground, #2563eb); text-underline-offset: 3px; }
  hr { border: none; border-top: 1px solid var(--vscode-panel-border, #e5e7eb); margin: 2rem 0; }
  img { max-width: 100%; border-radius: 4px; }
</style>
</head>
<body>
${html}
</body>
</html>`;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Activation ─────────────────────────────────────────────────────────────

function activate(context) {
  // Open preview command
  context.subscriptions.push(
    vscode.commands.registerCommand('markedin.preview', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.mi')) {
        vscode.window.showErrorMessage('Open a .mi file first.');
        return;
      }
      MiPreviewPanel.createOrShow(context.extensionUri, editor.document);
    })
  );

  // Live update on edit
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.fileName.endsWith('.mi')) {
        MiPreviewPanel.update(e.document);
      }
    })
  );

  // Update when switching to a .mi editor tab
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor && editor.document.fileName.endsWith('.mi')) {
        MiPreviewPanel.update(editor.document);
      }
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
