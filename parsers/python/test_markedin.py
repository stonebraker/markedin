"""
markedin test suite
Run with: python3 -m pytest test_markedin.py -v
"""

import json
import unittest

import markdown

from markedin import parse, render, render_html, render_html_frag, resolve_path


# ─── Helpers ─────────────────────────────────────────────────────────────────


def mi_with_body(frontmatter, body):
    return f"---\n{frontmatter}\n---\n{body}"


# ─── Parser ──────────────────────────────────────────────────────────────────


class TestParser(unittest.TestCase):
    def test_valid_frontmatter_and_body(self):
        data, body = parse(mi_with_body("key: value", "hello"))
        self.assertEqual(data["key"], "value")
        self.assertEqual(body, "hello")

    def test_frontmatter_values_accessible_by_key(self):
        data, _ = parse(mi_with_body("a: 1\nb: two\nc: true", ""))
        self.assertEqual(data["a"], 1)
        self.assertEqual(data["b"], "two")
        self.assertEqual(data["c"], True)

    def test_body_returned_verbatim(self):
        body = "# Title\n\n{{key}}\n\n- item"
        _, got = parse(mi_with_body("key: val", body))
        self.assertEqual(got, body)

    def test_no_frontmatter(self):
        src = "no frontmatter here"
        data, body = parse(src)
        self.assertEqual(data, {})
        self.assertEqual(body, src)

    def test_crlf_line_endings(self):
        data, body = parse("---\r\nkey: value\r\n---\r\nbody text")
        self.assertEqual(data["key"], "value")
        self.assertEqual(body, "body text")

    def test_empty_frontmatter_block(self):
        data, body = parse("---\n---\n")
        self.assertEqual(data, {})
        self.assertEqual(body, "")

    def test_empty_body(self):
        data, body = parse(mi_with_body("key: val", ""))
        self.assertEqual(data["key"], "val")
        self.assertEqual(body, "")

    def test_completely_empty_file(self):
        data, body = parse("")
        self.assertEqual(data, {})
        self.assertEqual(body, "")

    def test_frontmatter_only_no_body(self):
        data, body = parse("---\nkey: val\n---")
        self.assertEqual(data["key"], "val")
        self.assertEqual(body, "")

    def test_body_only_no_frontmatter_delimiters(self):
        src = "# Just a body\nsome text"
        data, body = parse(src)
        self.assertEqual(data, {})
        self.assertEqual(body, src)

    def test_hr_in_body_not_treated_as_delimiter(self):
        data, body = parse(mi_with_body("key: val", "before\n---\nafter"))
        self.assertEqual(body, "before\n---\nafter")

    def test_null_frontmatter_falls_back_to_empty(self):
        data, _ = parse("---\nnull\n---\n")
        self.assertEqual(data, {})


# ─── Scalar interpolation ───────────────────────────────────────────────────


class TestScalarInterpolation(unittest.TestCase):
    def test_string_value(self):
        self.assertEqual(render(mi_with_body("name: Alice", "{{name}}")), "Alice")

    def test_number_value(self):
        self.assertEqual(render(mi_with_body("n: 42", "{{n}}")), "42")

    def test_boolean_value(self):
        self.assertEqual(render(mi_with_body("flag: true", "{{flag}}")), "true")

    def test_deep_path(self):
        self.assertEqual(render(mi_with_body("a:\n  b:\n    c: deep", "{{a.b.c}}")), "deep")

    def test_array_index(self):
        self.assertEqual(render(mi_with_body("items:\n  - alpha\n  - beta", "{{items[0]}}")), "alpha")

    def test_mixed_path(self):
        self.assertEqual(
            render(mi_with_body("items:\n  - name: first\n  - name: second", "{{items[1].name}}")),
            "second",
        )

    def test_key_not_present(self):
        self.assertEqual(render(mi_with_body("a: 1", "{{missing}}")), "")

    def test_null_value(self):
        self.assertEqual(render(mi_with_body("key: null", "{{key}}")), "")

    def test_false_renders_false(self):
        self.assertEqual(render(mi_with_body("flag: false", "{{flag}}")), "false")

    def test_zero_renders_zero(self):
        self.assertEqual(render(mi_with_body("n: 0", "{{n}}")), "0")

    def test_inline_array(self):
        self.assertEqual(
            render(mi_with_body("tags:\n  - a\n  - b\n  - c", "{{tags}}")),
            "a, b, c",
        )

    def test_inline_object(self):
        out = render(mi_with_body("meta:\n  x: 1", "{{meta}}"))
        self.assertEqual(json.loads(out), {"x": 1})

    def test_loop_variables_outside_each(self):
        self.assertEqual(render(mi_with_body("", "{{@index}}{{@first}}{{@last}}")), "")


# ─── #each ───────────────────────────────────────────────────────────────────


class TestEach(unittest.TestCase):
    def test_iterates_scalars(self):
        src = mi_with_body("items:\n  - foo\n  - bar", "{{#each items}}{{this}}\n{{/each}}")
        self.assertEqual(render(src), "foo\nbar\n")

    def test_iterates_objects(self):
        src = mi_with_body("people:\n  - name: Ana\n  - name: Bo", "{{#each people}}{{name}}\n{{/each}}")
        self.assertEqual(render(src), "Ana\nBo\n")

    def test_at_index_zero_based(self):
        src = mi_with_body("items:\n  - a\n  - b", "{{#each items}}{{@index}}{{/each}}")
        self.assertEqual(render(src), "01")

    def test_at_first(self):
        src = mi_with_body("items:\n  - a\n  - b\n  - c", "{{#each items}}{{@first}} {{/each}}")
        self.assertEqual(render(src), "true false false ")

    def test_at_last(self):
        src = mi_with_body("items:\n  - a\n  - b\n  - c", "{{#each items}}{{@last}} {{/each}}")
        self.assertEqual(render(src), "false false true ")

    def test_empty_array(self):
        src = mi_with_body("items: []", "{{#each items}}{{this}}{{/each}}")
        self.assertEqual(render(src), "")

    def test_nested_each(self):
        src = mi_with_body(
            "outer:\n  - name: X\n    inner:\n      - name: Y",
            "{{#each outer}}{{name}}:{{#each inner}}{{name}}{{/each}} {{/each}}",
        )
        self.assertEqual(render(src), "X:Y ")

    def test_array_of_arrays(self):
        src = mi_with_body("matrix:\n  - [1, 2]\n  - [3, 4]", "{{#each matrix}}{{this}} {{/each}}")
        self.assertEqual(render(src), "1, 2 3, 4 ")

    def test_inner_shadows_outer(self):
        src = mi_with_body("name: outer\nitems:\n  - name: inner", "{{#each items}}{{name}}{{/each}}")
        self.assertEqual(render(src), "inner")

    def test_each_with_if_inside(self):
        src = mi_with_body(
            "items:\n  - active: true\n  - active: false",
            "{{#each items}}{{#if active}}yes{{else}}no{{/if}} {{/each}}",
        )
        self.assertEqual(render(src), "yes no ")

    def test_if_with_each_inside(self):
        src = mi_with_body(
            "show: true\nitems:\n  - a\n  - b",
            "{{#if show}}{{#each items}}{{this}}{{/each}}{{/if}}",
        )
        self.assertEqual(render(src), "ab")

    def test_non_array_scalar(self):
        self.assertEqual(render(mi_with_body("x: hello", "{{#each x}}{{this}}{{/each}}")), "")

    def test_non_array_object(self):
        self.assertEqual(render(mi_with_body("x:\n  a: 1", "{{#each x}}{{this}}{{/each}}")), "")

    def test_path_not_found(self):
        self.assertEqual(render(mi_with_body("a: 1", "{{#each missing}}{{this}}{{/each}}")), "")

    def test_array_of_nulls(self):
        src = mi_with_body("items:\n  - null\n  - null", "{{#each items}}[{{this}}]{{/each}}")
        self.assertEqual(render(src), "[][]")

    def test_single_item_first_and_last(self):
        src = mi_with_body("items:\n  - x", "{{#each items}}{{@first}},{{@last}}{{/each}}")
        self.assertEqual(render(src), "true,true")


# ─── #if ─────────────────────────────────────────────────────────────────────


class TestIf(unittest.TestCase):
    def test_truthy_string(self):
        self.assertEqual(render(mi_with_body("x: hello", "{{#if x}}yes{{/if}}")), "yes")

    def test_false(self):
        self.assertEqual(render(mi_with_body("x: false", "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_zero(self):
        self.assertEqual(render(mi_with_body("x: 0", "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_empty_string(self):
        self.assertEqual(render(mi_with_body('x: ""', "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_null(self):
        self.assertEqual(render(mi_with_body("x: null", "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_no_else_falsy(self):
        self.assertEqual(render(mi_with_body("x: false", "{{#if x}}yes{{/if}}")), "")

    def test_empty_array_falsy(self):
        self.assertEqual(render(mi_with_body("x: []", "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_empty_object_falsy(self):
        self.assertEqual(render(mi_with_body("x: {}", "{{#if x}}yes{{else}}no{{/if}}")), "no")

    def test_non_empty_array_truthy(self):
        self.assertEqual(render(mi_with_body("x:\n  - 1", "{{#if x}}yes{{else}}no{{/if}}")), "yes")

    def test_non_empty_object_truthy(self):
        self.assertEqual(render(mi_with_body("x:\n  a: 1", "{{#if x}}yes{{else}}no{{/if}}")), "yes")

    def test_nested_if(self):
        self.assertEqual(
            render(mi_with_body("a: true\nb: true", "{{#if a}}{{#if b}}both{{/if}}{{/if}}")),
            "both",
        )

    def test_path_not_found_falsy(self):
        self.assertEqual(render(mi_with_body("", "{{#if missing}}yes{{else}}no{{/if}}")), "no")


# ─── {{> partial}} ───────────────────────────────────────────────────────────


class TestPartial(unittest.TestCase):
    def test_inlines_string(self):
        self.assertEqual(render(mi_with_body("note: hello world", "{{> note}}")), "hello world")

    def test_key_not_found(self):
        self.assertEqual(render(mi_with_body("", "{{> missing}}")), "")


# ─── Double-evaluation protection ────────────────────────────────────────────


class TestDoubleEvalProtection(unittest.TestCase):
    def test_scalar_with_expression(self):
        src = mi_with_body('field: "{{name}}"\nname: Alice', "{{field}}")
        self.assertEqual(render(src), "{{name}}")

    def test_partial_with_expression(self):
        src = mi_with_body('field: "{{name}}"\nname: Alice', "{{> field}}")
        self.assertEqual(render(src), "{{name}}")

    def test_each_item_with_expression(self):
        src = mi_with_body('items:\n  - "{{x}}"', "{{#each items}}{{this}}{{/each}}")
        self.assertEqual(render(src), "{{x}}")



# ─── Escape ──────────────────────────────────────────────────────────────────


class TestEscape(unittest.TestCase):
    def test_escaped_expression_renders_literally(self):
        self.assertEqual(render(mi_with_body("name: Alice", r"\{{name}}")), "{{name}}")

    def test_escaped_and_resolved_coexist(self):
        self.assertEqual(render(mi_with_body("name: Alice", r"\{{name}} is {{name}}")), "{{name}} is Alice")


# ─── render() end-to-end ─────────────────────────────────────────────────────


class TestRenderEndToEnd(unittest.TestCase):
    def test_no_frontmatter_in_output(self):
        out = render(mi_with_body("key: val", "# Title"))
        self.assertFalse(out.startswith("---"))

    def test_plain_markdown_unchanged(self):
        src = mi_with_body("", "# Heading\n\n- item 1\n- item 2")
        self.assertEqual(render(src), "# Heading\n\n- item 1\n- item 2")

    def test_large_frontmatter(self):
        src = mi_with_body(
            "title: Report\ncount: 3\nflag: true\ntags:\n  - x\n  - y\nmeta:\n  version: 2\n"
            "team:\n  - name: Ana\n    role: lead\n  - name: Bo\n    role: dev",
            "{{title}} {{count}} {{flag}} {{tags}} {{#each team}}{{name}}({{role}}) {{/each}}",
        )
        self.assertEqual(render(src), "Report 3 true x, y Ana(lead) Bo(dev) ")

    def test_unicode(self):
        self.assertEqual(render(mi_with_body("greeting: こんにちは", "{{greeting}} 🌍")), "こんにちは 🌍")


# ─── HTML rendering ─────────────────────────────────────────────────────────


class TestHTMLRendering(unittest.TestCase):
    """Test that rendered Markdown converts to proper HTML via the markdown library."""

    def _render_html(self, source):
        md_text = render(source)
        return markdown.markdown(md_text, extensions=["tables"])

    def test_heading_becomes_h1(self):
        html = self._render_html(mi_with_body("title: Hello", "# {{title}}"))
        self.assertIn("<h1>Hello</h1>", html)

    def test_paragraph(self):
        html = self._render_html(mi_with_body("name: World", "Hello {{name}}"))
        self.assertIn("<p>Hello World</p>", html)

    def test_bold(self):
        html = self._render_html(mi_with_body("x: bold", "**{{x}}**"))
        self.assertIn("<strong>bold</strong>", html)

    def test_link(self):
        html = self._render_html(mi_with_body("url: https://example.com", "[link]({{url}})"))
        self.assertIn('href="https://example.com"', html)

    def test_table(self):
        src = mi_with_body(
            "items:\n  - name: A\n    val: 1\n  - name: B\n    val: 2",
            "| Name | Val |\n|------|-----|\n{{#each items}}| {{name}} | {{val}} |\n{{/each}}",
        )
        html = self._render_html(src)
        self.assertIn("<table>", html)
        self.assertIn("<th>Name</th>", html)
        self.assertIn("<td>A</td>", html)

    def test_code_block(self):
        html = self._render_html(mi_with_body("cmd: npm install", "```\n{{cmd}}\n```"))
        self.assertIn("<code>", html)
        self.assertIn("npm install", html)

    def test_unordered_list(self):
        src = mi_with_body("items:\n  - x\n  - y", "{{#each items}}- {{this}}\n{{/each}}")
        html = self._render_html(src)
        self.assertIn("<li>x</li>", html)
        self.assertIn("<li>y</li>", html)

    def test_full_document_structure(self):
        src = mi_with_body(
            "title: Test\nstatus: ok",
            "# {{title}}\n\n**Status:** {{status}}\n\n---\n\nBody text.",
        )
        html = self._render_html(src)
        self.assertIn("<h1>Test</h1>", html)
        self.assertIn("<strong>Status:</strong> ok", html)
        self.assertIn("<hr", html)
        self.assertIn("Body text.", html)


class TestRenderHtmlFrag(unittest.TestCase):
    def test_returns_html_without_wrapper(self):
        src = mi_with_body("title: Hello", "# {{title}}")
        html = render_html_frag(src)
        self.assertIn("<h1>Hello</h1>", html)
        self.assertNotIn("<!doctype", html)
        self.assertNotIn("<head>", html)

    def test_table_extension(self):
        src = mi_with_body("", "| A | B |\n|---|---|\n| 1 | 2 |")
        html = render_html_frag(src)
        self.assertIn("<table>", html)


class TestRenderHtml(unittest.TestCase):
    def test_full_document(self):
        src = mi_with_body("title: My Page", "# {{title}}\n\nHello world.")
        html = render_html(src)
        self.assertIn("<!doctype html>", html)
        self.assertIn("<title>My Page</title>", html)
        self.assertIn("<h1>My Page</h1>", html)
        self.assertIn("Hello world.", html)

    def test_includes_styles(self):
        src = mi_with_body("title: T", "text")
        html = render_html(src)
        self.assertIn("<style>", html)
        self.assertIn("max-width: 720px", html)

    def test_embed_false_no_script(self):
        src = mi_with_body("title: T", "text")
        html = render_html(src)
        self.assertNotIn("application/json", html)

    def test_embed_true_includes_frontmatter(self):
        src = mi_with_body("title: My Doc\nversion: 2", "# {{title}}")
        html = render_html(src, embed=True)
        self.assertIn('<script type="application/json" id="frontmatter">', html)
        self.assertIn('"title": "My Doc"', html)
        self.assertIn('"version": 2', html)

    def test_empty_title_fallback(self):
        src = mi_with_body("key: val", "text")
        html = render_html(src)
        self.assertIn("<title></title>", html)


class TestRenderEmbed(unittest.TestCase):
    def test_md_embed(self):
        src = mi_with_body("title: Hello", "# {{title}}")
        out = render(src, embed=True)
        self.assertIn("<!-- frontmatter", out)
        self.assertIn('"title": "Hello"', out)
        self.assertIn("-->", out)

    def test_md_no_embed(self):
        src = mi_with_body("title: Hello", "# {{title}}")
        out = render(src)
        self.assertNotIn("<!-- frontmatter", out)


if __name__ == "__main__":
    unittest.main()
