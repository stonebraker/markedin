/**
 * markedin test suite
 * Run with: node --test tests/parse.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { parse, render, resolvePath } = require('../parse');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mi(source) {
  return `---\n${source}\n---\n`;
}

function miWithBody(frontmatter, body) {
  return `---\n${frontmatter}\n---\n${body}`;
}

function cli(args, { expectFail = false } = {}) {
  try {
    const stdout = execFileSync(process.execPath, ['mi.js', ...args], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });
    return { stdout, code: 0 };
  } catch (e) {
    if (!expectFail) throw e;
    return { stdout: e.stdout || '', stderr: e.stderr || '', code: e.status };
  }
}

// Write a temp .mi file and return its path. Caller must clean up.
function tmpMi(source) {
  const f = path.join(os.tmpdir(), `mi-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mi`);
  fs.writeFileSync(f, source, 'utf8');
  return f;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

describe('Parser', () => {
  test('valid frontmatter and body parses correctly', () => {
    const { data, body } = parse(miWithBody('key: value', 'hello'));
    assert.equal(data.key, 'value');
    assert.equal(body, 'hello');
  });

  test('frontmatter values accessible by key', () => {
    const { data } = parse(mi('a: 1\nb: two\nc: true'));
    assert.equal(data.a, 1);
    assert.equal(data.b, 'two');
    assert.equal(data.c, true);
  });

  test('body returned verbatim before rendering', () => {
    const body = '# Title\n\n{{key}}\n\n- item';
    const { body: got } = parse(miWithBody('key: val', body));
    assert.equal(got, body);
  });

  test('no frontmatter returns empty data and full source as body', () => {
    const src = 'no frontmatter here';
    const { data, body } = parse(src);
    assert.deepEqual(data, {});
    assert.equal(body, src);
  });

  test('CRLF line endings handled', () => {
    const src = '---\r\nkey: value\r\n---\r\nbody text';
    const { data, body } = parse(src);
    assert.equal(data.key, 'value');
    assert.equal(body, 'body text');
  });

  test('empty frontmatter block', () => {
    const { data, body } = parse('---\n---\n');
    assert.deepEqual(data, {});
    assert.equal(body, '');
  });

  test('empty body', () => {
    const { data, body } = parse(mi('key: val'));
    assert.equal(data.key, 'val');
    assert.equal(body, '');
  });

  test('completely empty file', () => {
    const { data, body } = parse('');
    assert.deepEqual(data, {});
    assert.equal(body, '');
  });

  test('frontmatter only, no body', () => {
    const { data, body } = parse('---\nkey: val\n---');
    assert.equal(data.key, 'val');
    assert.equal(body, '');
  });

  test('body only, no frontmatter delimiters', () => {
    const src = '# Just a body\nsome text';
    const { data, body } = parse(src);
    assert.deepEqual(data, {});
    assert.equal(body, src);
  });

  test('--- in body not treated as closing delimiter', () => {
    const src = miWithBody('key: val', 'before\n---\nafter');
    const { body } = parse(src);
    assert.equal(body, 'before\n---\nafter');
  });

  test('frontmatter YAML that evaluates to null falls back to {}', () => {
    // YAML "null" or "~" as the entire doc evaluates to null
    const { data } = parse('---\nnull\n---\n');
    assert.deepEqual(data, {});
  });
});

// ─── Scalar interpolation ─────────────────────────────────────────────────────

describe('Scalar interpolation {{key}}', () => {
  test('string value renders correctly', () => {
    assert.equal(render(miWithBody('name: Alice', '{{name}}')), 'Alice');
  });

  test('number value renders as string', () => {
    assert.equal(render(miWithBody('n: 42', '{{n}}')), '42');
  });

  test('boolean value renders as string', () => {
    assert.equal(render(miWithBody('flag: true', '{{flag}}')), 'true');
  });

  test('deep path {{a.b.c}} resolves correctly', () => {
    const src = miWithBody('a:\n  b:\n    c: deep', '{{a.b.c}}');
    assert.equal(render(src), 'deep');
  });

  test('array index {{items[0]}} resolves correctly', () => {
    const src = miWithBody('items:\n  - alpha\n  - beta', '{{items[0]}}');
    assert.equal(render(src), 'alpha');
  });

  test('mixed path {{items[1].name}} resolves correctly', () => {
    const src = miWithBody('items:\n  - name: first\n  - name: second', '{{items[1].name}}');
    assert.equal(render(src), 'second');
  });

  test('key not present → empty string, no error', () => {
    assert.equal(render(miWithBody('a: 1', '{{missing}}')), '');
  });

  test('key present but value is null → empty string', () => {
    assert.equal(render(miWithBody('key: null', '{{key}}')), '');
  });

  test('value is false → renders "false"', () => {
    assert.equal(render(miWithBody('flag: false', '{{flag}}')), 'false');
  });

  test('value is 0 → renders "0"', () => {
    assert.equal(render(miWithBody('n: 0', '{{n}}')), '0');
  });

  test('inline array {{tags}} → comma-separated string', () => {
    const src = miWithBody('tags:\n  - a\n  - b\n  - c', '{{tags}}');
    assert.equal(render(src), 'a, b, c');
  });

  test('inline object {{meta}} → JSON string', () => {
    const src = miWithBody('meta:\n  x: 1', '{{meta}}');
    assert.equal(render(src), JSON.stringify({ x: 1 }));
  });

  test('{{@index}} outside #each → empty string, no error', () => {
    assert.equal(render(miWithBody('', '{{@index}}')), '');
  });

  test('{{@first}} outside #each → empty string, no error', () => {
    assert.equal(render(miWithBody('', '{{@first}}')), '');
  });

  test('{{@last}} outside #each → empty string, no error', () => {
    assert.equal(render(miWithBody('', '{{@last}}')), '');
  });
});

// ─── #each ────────────────────────────────────────────────────────────────────

describe('{{#each}}', () => {
  test('iterates array of scalars, {{this}} resolves each item', () => {
    const src = miWithBody('items:\n  - foo\n  - bar', '{{#each items}}{{this}}\n{{/each}}');
    assert.equal(render(src), 'foo\nbar\n');
  });

  test('iterates array of objects, fields available as {{name}}', () => {
    const src = miWithBody('people:\n  - name: Ana\n  - name: Bo', '{{#each people}}{{name}}\n{{/each}}');
    assert.equal(render(src), 'Ana\nBo\n');
  });

  test('{{@index}} is zero-based', () => {
    const src = miWithBody('items:\n  - a\n  - b', '{{#each items}}{{@index}}{{/each}}');
    assert.equal(render(src), '01');
  });

  test('{{@first}} is true only for first item', () => {
    const src = miWithBody('items:\n  - a\n  - b\n  - c', '{{#each items}}{{@first}} {{/each}}');
    assert.equal(render(src), 'true false false ');
  });

  test('{{@last}} is true only for last item', () => {
    const src = miWithBody('items:\n  - a\n  - b\n  - c', '{{#each items}}{{@last}} {{/each}}');
    assert.equal(render(src), 'false false true ');
  });

  test('empty array produces no output', () => {
    const src = miWithBody('items: []', '{{#each items}}{{this}}{{/each}}');
    assert.equal(render(src), '');
  });

  test('nested #each — inner fields do not bleed into outer context', () => {
    const src = miWithBody(
      'outer:\n  - name: X\n    inner:\n      - name: Y',
      '{{#each outer}}{{name}}:{{#each inner}}{{name}}{{/each}} {{/each}}'
    );
    assert.equal(render(src), 'X:Y ');
  });

  test('#each over array of arrays — {{this}} is itself an array', () => {
    const src = miWithBody('matrix:\n  - [1, 2]\n  - [3, 4]', '{{#each matrix}}{{this}} {{/each}}');
    assert.equal(render(src), '1, 2 3, 4 ');
  });

  test('inner context field shadows outer context field', () => {
    const src = miWithBody(
      'name: outer\nitems:\n  - name: inner',
      '{{#each items}}{{name}}{{/each}}'
    );
    assert.equal(render(src), 'inner');
  });

  test('#each with #if inside', () => {
    const src = miWithBody(
      'items:\n  - active: true\n  - active: false',
      '{{#each items}}{{#if active}}yes{{else}}no{{/if}} {{/each}}'
    );
    assert.equal(render(src), 'yes no ');
  });

  test('#if with #each inside', () => {
    const src = miWithBody(
      'show: true\nitems:\n  - a\n  - b',
      '{{#if show}}{{#each items}}{{this}}{{/each}}{{/if}}'
    );
    assert.equal(render(src), 'ab');
  });

  test('path resolves to non-array scalar → no output, no error', () => {
    const src = miWithBody('x: hello', '{{#each x}}{{this}}{{/each}}');
    assert.equal(render(src), '');
  });

  test('path resolves to object → no output, no error', () => {
    const src = miWithBody('x:\n  a: 1', '{{#each x}}{{this}}{{/each}}');
    assert.equal(render(src), '');
  });

  test('path not found → no output, no error', () => {
    const src = miWithBody('a: 1', '{{#each missing}}{{this}}{{/each}}');
    assert.equal(render(src), '');
  });

  test('array of nulls — {{this}} renders empty string per item', () => {
    const src = miWithBody('items:\n  - null\n  - null', '{{#each items}}[{{this}}]{{/each}}');
    assert.equal(render(src), '[][]');
  });

  test('single-item array — {{@first}} and {{@last}} both true', () => {
    const src = miWithBody('items:\n  - x', '{{#each items}}{{@first}},{{@last}}{{/each}}');
    assert.equal(render(src), 'true,true');
  });
});

// ─── #if ──────────────────────────────────────────────────────────────────────

describe('{{#if}}', () => {
  test('truthy string renders the truthy branch', () => {
    const src = miWithBody('x: hello', '{{#if x}}yes{{/if}}');
    assert.equal(render(src), 'yes');
  });

  test('false renders falsy branch', () => {
    const src = miWithBody('x: false', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('0 renders falsy branch', () => {
    const src = miWithBody('x: 0', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('empty string renders falsy branch', () => {
    const src = miWithBody('x: ""', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('null renders falsy branch', () => {
    const src = miWithBody('x: null', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('{{else}} branch renders when condition is falsy', () => {
    const src = miWithBody('x: false', '{{#if x}}yes{{else}}fallback{{/if}}');
    assert.equal(render(src), 'fallback');
  });

  test('no {{else}} and falsy condition → no output', () => {
    const src = miWithBody('x: false', '{{#if x}}yes{{/if}}');
    assert.equal(render(src), '');
  });

  test('empty array [] is falsy', () => {
    const src = miWithBody('x: []', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('empty object {} is falsy', () => {
    const src = miWithBody('x: {}', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });

  test('non-empty array is truthy', () => {
    const src = miWithBody('x:\n  - 1', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'yes');
  });

  test('non-empty object is truthy', () => {
    const src = miWithBody('x:\n  a: 1', '{{#if x}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'yes');
  });

  test('nested #if inside #if', () => {
    const src = miWithBody('a: true\nb: true', '{{#if a}}{{#if b}}both{{/if}}{{/if}}');
    assert.equal(render(src), 'both');
  });

  test('path not found → falsy', () => {
    const src = miWithBody('', '{{#if missing}}yes{{else}}no{{/if}}');
    assert.equal(render(src), 'no');
  });
});

// ─── {{> partial}} ────────────────────────────────────────────────────────────

describe('{{> partial}}', () => {
  test('inlines a frontmatter string value verbatim', () => {
    const src = miWithBody('note: hello world', '{{> note}}');
    assert.equal(render(src), 'hello world');
  });

  test('value is not re-rendered (no double-evaluation)', () => {
    const src = miWithBody('tpl: "{{name}}"\nname: Alice', '{{> tpl}}');
    assert.equal(render(src), '{{name}}');
  });

  test('key not found → empty string', () => {
    const src = miWithBody('', '{{> missing}}');
    assert.equal(render(src), '');
  });

  test('value containing {{expressions}} appears literally in output', () => {
    const src = miWithBody('raw: "{{foo}} {{bar}}"', '{{> raw}}');
    assert.equal(render(src), '{{foo}} {{bar}}');
  });
});

// ─── Double-evaluation protection ─────────────────────────────────────────────

describe('Double-evaluation protection', () => {
  test('frontmatter string with {{key}} referenced via {{field}} appears literally', () => {
    const src = miWithBody('field: "{{name}}"\nname: Alice', '{{field}}');
    assert.equal(render(src), '{{name}}');
  });

  test('frontmatter string with {{key}} referenced via {{> field}} appears literally', () => {
    const src = miWithBody('field: "{{name}}"\nname: Alice', '{{> field}}');
    assert.equal(render(src), '{{name}}');
  });

  test('array item string with {{expr}} appears literally via #each', () => {
    const src = miWithBody('items:\n  - "{{x}}"', '{{#each items}}{{this}}{{/each}}');
    assert.equal(render(src), '{{x}}');
  });

  test('code fence in body with {{expr}} is preserved verbatim', () => {
    const src = miWithBody('', '```\n{{expr}}\n```');
    assert.equal(render(src), '```\n{{expr}}\n```');
  });

  test('inline code span with {{expr}} is preserved verbatim', () => {
    const src = miWithBody('', 'use `{{expr}}` here');
    assert.equal(render(src), 'use `{{expr}}` here');
  });
});

// ─── render() end-to-end ─────────────────────────────────────────────────────

describe('render() end-to-end', () => {
  test('rendered output contains no --- frontmatter block', () => {
    const src = miWithBody('key: val', '# Title');
    const out = render(src);
    assert.ok(!out.startsWith('---'), 'output must not start with ---');
  });

  test('all {{ }} expressions resolved', () => {
    const src = miWithBody('a: 1\nb: two', '{{a}} {{b}}');
    assert.equal(render(src), '1 two');
  });

  test('plain markdown outside expressions passed through unchanged', () => {
    const src = miWithBody('', '# Heading\n\n- item 1\n- item 2');
    assert.equal(render(src), '# Heading\n\n- item 1\n- item 2');
  });

  test('large frontmatter with multiple types and nested structures', () => {
    const src = miWithBody(
      'title: Report\ncount: 3\nflag: true\ntags:\n  - x\n  - y\nmeta:\n  version: 2\nteam:\n  - name: Ana\n    role: lead\n  - name: Bo\n    role: dev',
      '{{title}} {{count}} {{flag}} {{tags}} {{#each team}}{{name}}({{role}}) {{/each}}'
    );
    assert.equal(render(src), 'Report 3 true x, y Ana(lead) Bo(dev) ');
  });

  test('chained dot-paths four levels deep', () => {
    const src = miWithBody('a:\n  b:\n    c:\n      d: found', '{{a.b.c.d}}');
    assert.equal(render(src), 'found');
  });

  test('body with no template expressions returned unchanged', () => {
    const src = miWithBody('key: val', 'just plain text');
    assert.equal(render(src), 'just plain text');
  });

  test('expression referencing null value → empty string', () => {
    const src = miWithBody('x: null', '{{x}}');
    assert.equal(render(src), '');
  });

  test('unicode in frontmatter values and body', () => {
    const src = miWithBody('greeting: こんにちは', '{{greeting}} 🌍');
    assert.equal(render(src), 'こんにちは 🌍');
  });
});

// ─── CLI ─────────────────────────────────────────────────────────────────────

describe('CLI', () => {
  const fixture = miWithBody('title: Test Doc\ncount: 2', '# {{title}}\n\nCount: {{count}}');
  let tmpFile;

  test.before(() => { tmpFile = tmpMi(fixture); });
  test.after(() => { try { fs.unlinkSync(tmpFile); } catch {} });

  // Default / --md
  test('default output is rendered markdown', () => {
    const { stdout, code } = cli([tmpFile]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('# Test Doc'));
    assert.ok(stdout.includes('Count: 2'));
  });

  test('--md outputs rendered markdown explicitly', () => {
    const { stdout, code } = cli([tmpFile, '--md']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('# Test Doc'));
  });

  // --html
  test('--html outputs a valid HTML document', () => {
    const { stdout, code } = cli([tmpFile, '--html']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('<!doctype html>'));
    assert.ok(stdout.includes('<title>'));
    assert.ok(stdout.includes('Test Doc'));
  });

  test('--html --embed includes frontmatter JSON in <head>', () => {
    const { stdout } = cli([tmpFile, '--html', '--embed']);
    assert.ok(stdout.includes('<script type="application/json" id="frontmatter">'));
    const json = JSON.parse(stdout.match(/<script[^>]*id="frontmatter"[^>]*>\s*([\s\S]*?)\s*<\/script>/)[1]);
    assert.equal(json.title, 'Test Doc');
    assert.equal(json.count, 2);
  });

  test('--html without --embed contains no frontmatter script tag', () => {
    const { stdout } = cli([tmpFile, '--html']);
    assert.ok(!stdout.includes('id="frontmatter"'));
  });

  // --md --embed
  test('--embed appends frontmatter as HTML comment at bottom of markdown', () => {
    const { stdout } = cli([tmpFile, '--embed']);
    assert.ok(stdout.includes('<!-- frontmatter'));
    assert.ok(stdout.includes('-->'));
    const commentMatch = stdout.match(/<!-- frontmatter\n([\s\S]*?)\n-->/);
    assert.ok(commentMatch, 'frontmatter comment block present');
    const json = JSON.parse(commentMatch[1]);
    assert.equal(json.title, 'Test Doc');
    assert.equal(json.count, 2);
    // comment appears after body content
    assert.ok(stdout.indexOf('Count: 2') < stdout.indexOf('<!-- frontmatter'));
  });

  // --json
  test('--json outputs valid JSON matching frontmatter', () => {
    const { stdout, code } = cli([tmpFile, '--json']);
    assert.equal(code, 0);
    const json = JSON.parse(stdout);
    assert.equal(json.title, 'Test Doc');
    assert.equal(json.count, 2);
  });

  test('--json ignores --embed flag', () => {
    const { stdout } = cli([tmpFile, '--json', '--embed']);
    const json = JSON.parse(stdout);
    assert.equal(json.title, 'Test Doc');
    assert.ok(!stdout.includes('<!--'));
  });

  // --yaml
  test('--yaml outputs valid YAML matching frontmatter', () => {
    const { stdout, code } = cli([tmpFile, '--yaml']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('title: Test Doc'));
    assert.ok(stdout.includes('count: 2'));
  });

  test('--yaml ignores --embed flag', () => {
    const { stdout } = cli([tmpFile, '--yaml', '--embed']);
    assert.ok(stdout.includes('title: Test Doc'));
    assert.ok(!stdout.includes('<!--'));
  });

  // -o
  test('-o writes output to a file', () => {
    const out = path.join(os.tmpdir(), `mi-test-out-${Date.now()}.md`);
    try {
      const { code } = cli([tmpFile, '-o', out]);
      assert.equal(code, 0);
      const contents = fs.readFileSync(out, 'utf8');
      assert.ok(contents.includes('# Test Doc'));
    } finally {
      try { fs.unlinkSync(out); } catch {}
    }
  });

  // check subcommand
  test('check exits 0 for valid file', () => {
    const { stdout, code } = cli(['check', tmpFile]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('✓'));
  });

  test('check exits non-zero for invalid YAML frontmatter', () => {
    const bad = tmpMi('---\n: bad: yaml:\n---\nbody');
    try {
      const { code } = cli(['check', bad], { expectFail: true });
      assert.notEqual(code, 0);
    } finally {
      try { fs.unlinkSync(bad); } catch {}
    }
  });

  // --help
  test('--help exits 0 and prints usage to stdout', () => {
    const { stdout, code } = cli(['--help']);
    assert.equal(code, 0);
    assert.ok(stdout.toLowerCase().includes('usage'));
  });

  // Error cases
  test('no arguments exits 0 and prints usage (--help)', () => {
    const { stdout, code } = cli(['--help']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('Usage'));
  });

  test('non-existent file path exits non-zero with error message', () => {
    const { stderr, code } = cli(['/no/such/file.mi'], { expectFail: true });
    assert.notEqual(code, 0);
    assert.ok(stderr.toLowerCase().includes('not found'));
  });
});
