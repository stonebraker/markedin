#!/usr/bin/env node
/**
 * mi — markedin CLI
 *
 * Usage:
 *   mi <file.mi> [--md|--html|--json|--yaml] [--embed] [-o <file>]
 *   mi check <file.mi>
 *   mi --help
 */

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parse, render } = require('./parse');
const { marked } = require('marked');

const args = process.argv.slice(2);

function usage() {
  console.log(`
Usage:
  mi <file.mi> [options]    Render a .mi file
  mi check <file.mi>        Validate frontmatter and report structure
  mi --help                 Show this help

Output format (default: --md):
  --md      Rendered markdown
  --html    Full HTML document
  --json    Frontmatter as JSON
  --yaml    Frontmatter as YAML

Options:
  --embed   Append frontmatter as a comment in the output
            For --md: HTML comment at the bottom
            For --html: <script type="application/json"> in <head>
            Ignored when used with --json or --yaml
  -o <file> Write output to a file instead of stdout
  `.trim());
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) usage();

// check subcommand
if (args[0] === 'check') {
  const filePath = args[1];
  if (!filePath) {
    console.error('Usage: mi check <file.mi>');
    process.exit(1);
  }
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  try {
    const { data, body } = parse(fs.readFileSync(abs, 'utf8'));
    const keys = Object.keys(data);
    console.log(`✓ Frontmatter OK — ${keys.length} key(s)`);
    console.log(`✓ Body: ${body.split('\n').length} line(s)`);
  } catch (e) {
    console.error(`✗ Parse error: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// Resolve file path (first non-flag argument)
const filePath = args.find(a => !a.startsWith('-'));
if (!filePath) usage();

const abs = path.resolve(filePath);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(1);
}

const flags = new Set(args.filter(a => a.startsWith('-')));
const outIdx = args.indexOf('-o');
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;

const isHtml  = flags.has('--html');
const isJson  = flags.has('--json');
const isYaml  = flags.has('--yaml');
const embed   = flags.has('--embed');

const source = fs.readFileSync(abs, 'utf8');
const { data } = parse(source);

let output;

if (isJson) {
  output = JSON.stringify(data, null, 2) + '\n';
} else if (isYaml) {
  output = yaml.dump(data);
} else if (isHtml) {
  const markdown = render(source);
  const body = marked.parse(markdown);
  const title = data.title || path.basename(abs, '.mi');
  const dataBlock = embed
    ? `\n<script type="application/json" id="frontmatter">\n${JSON.stringify(data, null, 2)}\n</script>`
    : '';
  output = `<!doctype html>
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
} else {
  // --md (default)
  output = render(source);
  if (embed) {
    output = output.trimEnd()
      + '\n\n<!-- frontmatter\n'
      + JSON.stringify(data, null, 2)
      + '\n-->\n';
  }
}

if (outFile) {
  fs.writeFileSync(path.resolve(outFile), output, 'utf8');
} else {
  process.stdout.write(output);
}
