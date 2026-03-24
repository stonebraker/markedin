package markedin

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

// ─── helpers ────────────────────────────────────────────────────────────────

func miWithBody(frontmatter, body string) string {
	return "---\n" + frontmatter + "\n---\n" + body
}

func mustRender(t *testing.T, source string) string {
	t.Helper()
	out, err := Render(source)
	if err != nil {
		t.Fatalf("Render failed: %v", err)
	}
	return out
}

// ─── Parser ─────────────────────────────────────────────────────────────────

func TestParser(t *testing.T) {
	t.Run("valid frontmatter and body parses correctly", func(t *testing.T) {
		doc, err := Parse(miWithBody("key: value", "hello"))
		assertNoErr(t, err)
		assertEqual(t, doc.Data["key"], "value")
		assertEqual(t, doc.Body, "hello")
	})

	t.Run("frontmatter values accessible by key", func(t *testing.T) {
		doc, err := Parse(miWithBody("a: 1\nb: two\nc: true", ""))
		assertNoErr(t, err)
		assertEqual(t, doc.Data["a"], 1)
		assertEqual(t, doc.Data["b"], "two")
		assertEqual(t, doc.Data["c"], true)
	})

	t.Run("body returned verbatim before rendering", func(t *testing.T) {
		body := "# Title\n\n{{key}}\n\n- item"
		doc, err := Parse(miWithBody("key: val", body))
		assertNoErr(t, err)
		assertEqual(t, doc.Body, body)
	})

	t.Run("no frontmatter returns empty data and full source as body", func(t *testing.T) {
		src := "no frontmatter here"
		doc, err := Parse(src)
		assertNoErr(t, err)
		assertEqual(t, len(doc.Data), 0)
		assertEqual(t, doc.Body, src)
	})

	t.Run("CRLF line endings handled", func(t *testing.T) {
		doc, err := Parse("---\r\nkey: value\r\n---\r\nbody text")
		assertNoErr(t, err)
		assertEqual(t, doc.Data["key"], "value")
		assertEqual(t, doc.Body, "body text")
	})

	t.Run("empty frontmatter block", func(t *testing.T) {
		doc, err := Parse("---\n---\n")
		assertNoErr(t, err)
		assertEqual(t, len(doc.Data), 0)
		assertEqual(t, doc.Body, "")
	})

	t.Run("empty body", func(t *testing.T) {
		doc, err := Parse(miWithBody("key: val", ""))
		assertNoErr(t, err)
		assertEqual(t, doc.Data["key"], "val")
		assertEqual(t, doc.Body, "")
	})

	t.Run("completely empty file", func(t *testing.T) {
		doc, err := Parse("")
		assertNoErr(t, err)
		assertEqual(t, len(doc.Data), 0)
		assertEqual(t, doc.Body, "")
	})

	t.Run("frontmatter only no body", func(t *testing.T) {
		doc, err := Parse("---\nkey: val\n---")
		assertNoErr(t, err)
		assertEqual(t, doc.Data["key"], "val")
		assertEqual(t, doc.Body, "")
	})

	t.Run("body only no frontmatter delimiters", func(t *testing.T) {
		src := "# Just a body\nsome text"
		doc, err := Parse(src)
		assertNoErr(t, err)
		assertEqual(t, len(doc.Data), 0)
		assertEqual(t, doc.Body, src)
	})

	t.Run("--- in body not treated as closing delimiter", func(t *testing.T) {
		doc, err := Parse(miWithBody("key: val", "before\n---\nafter"))
		assertNoErr(t, err)
		assertEqual(t, doc.Body, "before\n---\nafter")
	})

	t.Run("frontmatter YAML that evaluates to null falls back to empty", func(t *testing.T) {
		doc, err := Parse("---\nnull\n---\n")
		assertNoErr(t, err)
		assertEqual(t, len(doc.Data), 0)
	})
}

// ─── Scalar interpolation ───────────────────────────────────────────────────

func TestScalarInterpolation(t *testing.T) {
	t.Run("string value renders correctly", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("name: Alice", "{{name}}")), "Alice")
	})

	t.Run("number value renders as string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("n: 42", "{{n}}")), "42")
	})

	t.Run("boolean value renders as string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("flag: true", "{{flag}}")), "true")
	})

	t.Run("deep path resolves correctly", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("a:\n  b:\n    c: deep", "{{a.b.c}}")), "deep")
	})

	t.Run("array index resolves correctly", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("items:\n  - alpha\n  - beta", "{{items[0]}}")), "alpha")
	})

	t.Run("mixed path resolves correctly", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("items:\n  - name: first\n  - name: second", "{{items[1].name}}")), "second")
	})

	t.Run("key not present returns empty string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("a: 1", "{{missing}}")), "")
	})

	t.Run("key present but value is null returns empty string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("key: null", "{{key}}")), "")
	})

	t.Run("value is false renders false", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("flag: false", "{{flag}}")), "false")
	})

	t.Run("value is 0 renders 0", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("n: 0", "{{n}}")), "0")
	})

	t.Run("inline array renders comma-separated", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("tags:\n  - a\n  - b\n  - c", "{{tags}}")), "a, b, c")
	})

	t.Run("inline object renders JSON", func(t *testing.T) {
		out := mustRender(t, miWithBody("meta:\n  x: 1", "{{meta}}"))
		var got map[string]any
		if err := json.Unmarshal([]byte(out), &got); err != nil {
			t.Fatalf("output is not valid JSON: %s", out)
		}
		assertEqual(t, got["x"], float64(1))
	})

	t.Run("loop variables outside each return empty string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("", "{{@index}}{{@first}}{{@last}}")), "")
	})
}

// ─── #each ──────────────────────────────────────────────────────────────────

func TestEach(t *testing.T) {
	t.Run("iterates array of scalars", func(t *testing.T) {
		src := miWithBody("items:\n  - foo\n  - bar", "{{#each items}}{{this}}\n{{/each}}")
		assertEqual(t, mustRender(t, src), "foo\nbar\n")
	})

	t.Run("iterates array of objects", func(t *testing.T) {
		src := miWithBody("people:\n  - name: Ana\n  - name: Bo", "{{#each people}}{{name}}\n{{/each}}")
		assertEqual(t, mustRender(t, src), "Ana\nBo\n")
	})

	t.Run("@index is zero-based", func(t *testing.T) {
		src := miWithBody("items:\n  - a\n  - b", "{{#each items}}{{@index}}{{/each}}")
		assertEqual(t, mustRender(t, src), "01")
	})

	t.Run("@first is true only for first item", func(t *testing.T) {
		src := miWithBody("items:\n  - a\n  - b\n  - c", "{{#each items}}{{@first}} {{/each}}")
		assertEqual(t, mustRender(t, src), "true false false ")
	})

	t.Run("@last is true only for last item", func(t *testing.T) {
		src := miWithBody("items:\n  - a\n  - b\n  - c", "{{#each items}}{{@last}} {{/each}}")
		assertEqual(t, mustRender(t, src), "false false true ")
	})

	t.Run("empty array produces no output", func(t *testing.T) {
		src := miWithBody("items: []", "{{#each items}}{{this}}{{/each}}")
		assertEqual(t, mustRender(t, src), "")
	})

	t.Run("nested each", func(t *testing.T) {
		src := miWithBody(
			"outer:\n  - name: X\n    inner:\n      - name: Y",
			"{{#each outer}}{{name}}:{{#each inner}}{{name}}{{/each}} {{/each}}",
		)
		assertEqual(t, mustRender(t, src), "X:Y ")
	})

	t.Run("each over array of arrays", func(t *testing.T) {
		src := miWithBody("matrix:\n  - [1, 2]\n  - [3, 4]", "{{#each matrix}}{{this}} {{/each}}")
		assertEqual(t, mustRender(t, src), "1, 2 3, 4 ")
	})

	t.Run("inner context field shadows outer", func(t *testing.T) {
		src := miWithBody("name: outer\nitems:\n  - name: inner", "{{#each items}}{{name}}{{/each}}")
		assertEqual(t, mustRender(t, src), "inner")
	})

	t.Run("each with if inside", func(t *testing.T) {
		src := miWithBody(
			"items:\n  - active: true\n  - active: false",
			"{{#each items}}{{#if active}}yes{{else}}no{{/if}} {{/each}}",
		)
		assertEqual(t, mustRender(t, src), "yes no ")
	})

	t.Run("if with each inside", func(t *testing.T) {
		src := miWithBody(
			"show: true\nitems:\n  - a\n  - b",
			"{{#if show}}{{#each items}}{{this}}{{/each}}{{/if}}",
		)
		assertEqual(t, mustRender(t, src), "ab")
	})

	t.Run("path resolves to non-array scalar", func(t *testing.T) {
		src := miWithBody("x: hello", "{{#each x}}{{this}}{{/each}}")
		assertEqual(t, mustRender(t, src), "")
	})

	t.Run("path resolves to object", func(t *testing.T) {
		src := miWithBody("x:\n  a: 1", "{{#each x}}{{this}}{{/each}}")
		assertEqual(t, mustRender(t, src), "")
	})

	t.Run("path not found", func(t *testing.T) {
		src := miWithBody("a: 1", "{{#each missing}}{{this}}{{/each}}")
		assertEqual(t, mustRender(t, src), "")
	})

	t.Run("array of nulls", func(t *testing.T) {
		src := miWithBody("items:\n  - null\n  - null", "{{#each items}}[{{this}}]{{/each}}")
		assertEqual(t, mustRender(t, src), "[][]")
	})

	t.Run("single-item array first and last both true", func(t *testing.T) {
		src := miWithBody("items:\n  - x", "{{#each items}}{{@first}},{{@last}}{{/each}}")
		assertEqual(t, mustRender(t, src), "true,true")
	})
}

// ─── #if ────────────────────────────────────────────────────────────────────

func TestIf(t *testing.T) {
	t.Run("truthy string renders truthy branch", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: hello", "{{#if x}}yes{{/if}}")), "yes")
	})

	t.Run("false renders falsy branch", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: false", "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("0 renders falsy branch", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: 0", "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("empty string renders falsy branch", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody(`x: ""`, "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("null renders falsy branch", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: null", "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("no else and falsy condition produces no output", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: false", "{{#if x}}yes{{/if}}")), "")
	})

	t.Run("empty array is falsy", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: []", "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("empty object is falsy", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x: {}", "{{#if x}}yes{{else}}no{{/if}}")), "no")
	})

	t.Run("non-empty array is truthy", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x:\n  - 1", "{{#if x}}yes{{else}}no{{/if}}")), "yes")
	})

	t.Run("non-empty object is truthy", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("x:\n  a: 1", "{{#if x}}yes{{else}}no{{/if}}")), "yes")
	})

	t.Run("nested if inside if", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("a: true\nb: true", "{{#if a}}{{#if b}}both{{/if}}{{/if}}")), "both")
	})

	t.Run("path not found is falsy", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("", "{{#if missing}}yes{{else}}no{{/if}}")), "no")
	})
}

// ─── {{> partial}} ──────────────────────────────────────────────────────────

func TestPartial(t *testing.T) {
	t.Run("inlines a frontmatter string value verbatim", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("note: hello world", "{{> note}}")), "hello world")
	})

	t.Run("key not found returns empty string", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("", "{{> missing}}")), "")
	})
}

// ─── Double-evaluation protection ───────────────────────────────────────────

func TestDoubleEvalProtection(t *testing.T) {
	t.Run("scalar value containing expression appears literally", func(t *testing.T) {
		src := miWithBody("field: \"{{name}}\"\nname: Alice", "{{field}}")
		assertEqual(t, mustRender(t, src), "{{name}}")
	})

	t.Run("partial value containing expression appears literally", func(t *testing.T) {
		src := miWithBody("field: \"{{name}}\"\nname: Alice", "{{> field}}")
		assertEqual(t, mustRender(t, src), "{{name}}")
	})

	t.Run("each item containing expression appears literally", func(t *testing.T) {
		src := miWithBody("items:\n  - \"{{x}}\"", "{{#each items}}{{this}}{{/each}}")
		assertEqual(t, mustRender(t, src), "{{x}}")
	})
}

// ─── Escape ─────────────────────────────────────────────────────────────────

func TestEscape(t *testing.T) {
	t.Run("escaped expression renders literally", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("name: Alice", `\{{name}}`)), "{{name}}")
	})

	t.Run("escaped and resolved coexist", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("name: Alice", `\{{name}} is {{name}}`)), "{{name}} is Alice")
	})
}

// ─── render() end-to-end ────────────────────────────────────────────────────

func TestRenderEndToEnd(t *testing.T) {
	t.Run("rendered output contains no frontmatter block", func(t *testing.T) {
		out := mustRender(t, miWithBody("key: val", "# Title"))
		if len(out) >= 3 && out[:3] == "---" {
			t.Fatal("output must not start with ---")
		}
	})

	t.Run("plain markdown passed through unchanged", func(t *testing.T) {
		src := miWithBody("", "# Heading\n\n- item 1\n- item 2")
		assertEqual(t, mustRender(t, src), "# Heading\n\n- item 1\n- item 2")
	})

	t.Run("large frontmatter with multiple types", func(t *testing.T) {
		src := miWithBody(
			"title: Report\ncount: 3\nflag: true\ntags:\n  - x\n  - y\nmeta:\n  version: 2\nteam:\n  - name: Ana\n    role: lead\n  - name: Bo\n    role: dev",
			"{{title}} {{count}} {{flag}} {{tags}} {{#each team}}{{name}}({{role}}) {{/each}}",
		)
		assertEqual(t, mustRender(t, src), "Report 3 true x, y Ana(lead) Bo(dev) ")
	})

	t.Run("unicode in frontmatter values and body", func(t *testing.T) {
		assertEqual(t, mustRender(t, miWithBody("greeting: こんにちは", "{{greeting}} 🌍")), "こんにちは 🌍")
	})
}

// ─── RenderHTMLFrag ─────────────────────────────────────────────────────────

func TestRenderHTMLFrag(t *testing.T) {
	t.Run("returns HTML without document wrapper", func(t *testing.T) {
		html, err := RenderHTMLFrag(miWithBody("title: Hello", "# {{title}}"))
		assertNoErr(t, err)
		assertContains(t, html, "<h1>Hello</h1>")
		assertNotContains(t, html, "<!doctype")
		assertNotContains(t, html, "<head>")
	})

	t.Run("table extension enabled", func(t *testing.T) {
		html, err := RenderHTMLFrag(miWithBody("", "| A | B |\n|---|---|\n| 1 | 2 |"))
		assertNoErr(t, err)
		assertContains(t, html, "<table>")
	})
}

// ─── RenderHTML ─────────────────────────────────────────────────────────────

func TestRenderHTML(t *testing.T) {
	t.Run("full HTML document", func(t *testing.T) {
		html, err := RenderHTML(miWithBody("title: My Page", "# {{title}}\n\nHello world."))
		assertNoErr(t, err)
		assertContains(t, html, "<!doctype html>")
		assertContains(t, html, "<title>My Page</title>")
		assertContains(t, html, "<h1>My Page</h1>")
		assertContains(t, html, "Hello world.")
	})

	t.Run("includes styles", func(t *testing.T) {
		html, err := RenderHTML(miWithBody("title: T", "text"))
		assertNoErr(t, err)
		assertContains(t, html, "<style>")
		assertContains(t, html, "max-width: 720px")
	})

	t.Run("no embed by default", func(t *testing.T) {
		html, err := RenderHTML(miWithBody("title: T", "text"))
		assertNoErr(t, err)
		assertNotContains(t, html, "application/json")
	})

	t.Run("embed includes frontmatter script tag", func(t *testing.T) {
		html, err := RenderHTML(miWithBody("title: My Doc\nversion: 2", "# {{title}}"), WithEmbed())
		assertNoErr(t, err)
		assertContains(t, html, `<script type="application/json" id="frontmatter">`)
		assertContains(t, html, `"title": "My Doc"`)
	})

	t.Run("empty title", func(t *testing.T) {
		html, err := RenderHTML(miWithBody("key: val", "text"))
		assertNoErr(t, err)
		assertContains(t, html, "<title></title>")
	})
}

// ─── Render with embed ──────────────────────────────────────────────────────

func TestRenderEmbed(t *testing.T) {
	t.Run("embed appends frontmatter comment", func(t *testing.T) {
		out, err := Render(miWithBody("title: Hello", "# {{title}}"), WithEmbed())
		assertNoErr(t, err)
		assertContains(t, out, "<!-- frontmatter")
		assertContains(t, out, `"title": "Hello"`)
		assertContains(t, out, "-->")
	})

	t.Run("no embed by default", func(t *testing.T) {
		out, err := Render(miWithBody("title: Hello", "# {{title}}"))
		assertNoErr(t, err)
		assertNotContains(t, out, "<!-- frontmatter")
	})
}

// ─── Standalone tag stripping ────────────────────────────────────────────────

func TestStandaloneTagStripping(t *testing.T) {
	t.Run("each on own lines does not produce blank lines", func(t *testing.T) {
		src := miWithBody("items:\n  - a\n  - b", "before\n{{#each items}}\n{{this}}\n{{/each}}\nafter")
		assertEqual(t, mustRender(t, src), "before\na\nb\nafter")
	})

	t.Run("table with each renders valid markdown table", func(t *testing.T) {
		src := miWithBody(
			"rows:\n  - name: Alice\n    role: eng\n  - name: Bob\n    role: pm",
			"| Name | Role |\n|------|------|\n{{#each rows}}\n| {{name}} | {{role}} |\n{{/each}}",
		)
		want := "| Name | Role |\n|------|------|\n| Alice | eng |\n| Bob | pm |\n"
		assertEqual(t, mustRender(t, src), want)
	})

	t.Run("if/else on own lines stripped", func(t *testing.T) {
		src := miWithBody("show: true", "before\n{{#if show}}\nyes\n{{else}}\nno\n{{/if}}\nafter")
		assertEqual(t, mustRender(t, src), "before\nyes\nafter")
	})

	t.Run("inline tags not stripped", func(t *testing.T) {
		src := miWithBody("items:\n  - x", "a{{#each items}}{{this}}{{/each}}b")
		assertEqual(t, mustRender(t, src), "axb")
	})
}

// ─── test helpers ───────────────────────────────────────────────────────────

func assertNoErr(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func assertEqual(t *testing.T, got, want any) {
	t.Helper()
	if fmt.Sprintf("%v", got) != fmt.Sprintf("%v", want) {
		t.Fatalf("got %q, want %q", fmt.Sprintf("%v", got), fmt.Sprintf("%v", want))
	}
}

func assertContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if !strings.Contains(haystack, needle) {
		t.Fatalf("expected output to contain %q, got:\n%s", needle, haystack)
	}
}

func assertNotContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if strings.Contains(haystack, needle) {
		t.Fatalf("expected output NOT to contain %q, got:\n%s", needle, haystack)
	}
}
