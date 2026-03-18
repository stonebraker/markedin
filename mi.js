#!/usr/bin/env node
/**
 * mi — markedin CLI
 *
 * Usage:
 *   mi render <file.mi>              — print rendered markdown to stdout
 *   mi html   <file.mi> [--embed]    — print full HTML document to stdout
 *                                      --embed: include frontmatter as JSON in <head>
 *                                               so agents can read structured data
 *                                               from the rendered page
 *   mi data   <file.mi>              — print parsed frontmatter as JSON
 *   mi check  <file.mi>              — validate frontmatter parses cleanly
 */

const fs = require('fs');
const path = require('path');
const { parse, render } = require('./parse');
const { marked } = require('marked');

const [,, cmd, filePath, ...flags] = process.argv;
const embedData = flags.includes('--embed');

function usage() {
  console.error('Usage: mi <render|html|data|check> <file.mi> [--embed]');
  process.exit(1);
}

if (!cmd || !filePath) usage();

const abs = path.resolve(filePath);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(1);
}

const source = fs.readFileSync(abs, 'utf8');

switch (cmd) {
  case 'render': {
    process.stdout.write(render(source));
    break;
  }
  case 'html': {
    const { data } = parse(source);
    const markdown = render(source);
    const body = marked.parse(markdown);
    const title = data.title || path.basename(abs, '.mi');
    const dataBlock = embedData
      ? `\n<script type="application/json" id="frontmatter">\n${JSON.stringify(data, null, 2)}\n</script>`
      : '';
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>${dataBlock}
<style>
  body { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 1.0625rem; line-height: 1.65; color: #1f2937; }
  h1, h2, h3 { color: #111827; letter-spacing: -.02em; }
  h1 { font-size: 2rem; margin-bottom: .5rem; }
  h2 { font-size: 1.4rem; margin-top: 2.5rem; }
  h3 { font-size: 1.1rem; margin-top: 2rem; }
  code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: .875em; background: #f3f4f6; padding: .1em .35em; border-radius: 3px; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 1.25rem; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e7eb; }
  th { font-size: .8125rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  a { color: #2563eb; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
    process.stdout.write(html);
    break;
  }
  case 'data': {
    const { data } = parse(source);
    console.log(JSON.stringify(data, null, 2));
    break;
  }
  case 'check': {
    try {
      const { data, body } = parse(source);
      const keys = Object.keys(data);
      console.log(`✓ Frontmatter OK — ${keys.length} key(s): ${keys.join(', ')}`);
      console.log(`✓ Body: ${body.split('\n').length} line(s)`);
    } catch (e) {
      console.error(`✗ Parse error: ${e.message}`);
      process.exit(1);
    }
    break;
  }
  default:
    usage();
}
