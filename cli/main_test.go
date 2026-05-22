package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// ─── helpers ────────────────────────────────────────────────────────────────

var binary string

func TestMain(m *testing.M) {
	// Build the binary once before all tests.
	tmp, err := os.MkdirTemp("", "mi-cli-test")
	if err != nil {
		panic(err)
	}
	binary = filepath.Join(tmp, "mi")
	out, err := exec.Command("go", "build", "-o", binary, ".").CombinedOutput()
	if err != nil {
		panic("build failed: " + string(out))
	}
	code := m.Run()
	os.RemoveAll(tmp)
	os.Exit(code)
}

func tmpMi(t *testing.T, source string) string {
	t.Helper()
	f, err := os.CreateTemp("", "mi-test-*.mi")
	if err != nil {
		t.Fatal(err)
	}
	f.WriteString(source)
	f.Close()
	t.Cleanup(func() { os.Remove(f.Name()) })
	return f.Name()
}

func miWithBody(frontmatter, body string) string {
	return "---\n" + frontmatter + "\n---\n" + body
}

type result struct {
	stdout string
	stderr string
	code   int
}

func run(args ...string) result {
	cmd := exec.Command(binary, args...)
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	code := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			code = exitErr.ExitCode()
		} else {
			code = 1
		}
	}
	return result{stdout: stdout.String(), stderr: stderr.String(), code: code}
}

// ─── tests ──────────────────────────────────────────────────────────────────

func TestCLI(t *testing.T) {
	fixture := miWithBody("title: Test Doc\ncount: 2", "# {{title}}\n\nCount: {{count}}")
	tmpFile := tmpMi(t, fixture)

	// Default / --md
	t.Run("default output is rendered markdown", func(t *testing.T) {
		r := run(tmpFile)
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "# Test Doc")
		assertContains(t, r.stdout, "Count: 2")
	})

	// --html
	t.Run("--html outputs a valid HTML document", func(t *testing.T) {
		r := run(tmpFile, "--html")
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "<!doctype html>")
		assertContains(t, r.stdout, "<title>")
		assertContains(t, r.stdout, "Test Doc")
	})

	t.Run("--html contains rendered HTML not raw markdown", func(t *testing.T) {
		r := run(tmpFile, "--html")
		assertContains(t, r.stdout, "<h1>Test Doc</h1>")
		assertContains(t, r.stdout, "<p>Count: 2</p>")
	})

	t.Run("--html --embed includes frontmatter JSON in head", func(t *testing.T) {
		r := run(tmpFile, "--html", "--embed")
		assertContains(t, r.stdout, `<script type="application/json" id="frontmatter">`)
		re := regexp.MustCompile(`<script[^>]*id="frontmatter"[^>]*>\s*([\s\S]*?)\s*</script>`)
		m := re.FindStringSubmatch(r.stdout)
		if m == nil {
			t.Fatal("frontmatter script tag not found")
		}
		var data map[string]any
		if err := json.Unmarshal([]byte(m[1]), &data); err != nil {
			t.Fatalf("invalid JSON in frontmatter block: %v", err)
		}
		assertEqual(t, data["title"], "Test Doc")
		assertEqual(t, data["count"], float64(2))
	})

	t.Run("--html without --embed contains no frontmatter script tag", func(t *testing.T) {
		r := run(tmpFile, "--html")
		assertNotContains(t, r.stdout, `id="frontmatter"`)
	})

	// --html-frag
	t.Run("--html-frag outputs HTML fragment without wrapper", func(t *testing.T) {
		r := run(tmpFile, "--html-frag")
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "<h1>Test Doc</h1>")
		assertContains(t, r.stdout, "<p>Count: 2</p>")
		assertNotContains(t, r.stdout, "<!doctype")
		assertNotContains(t, r.stdout, "<head>")
		assertNotContains(t, r.stdout, "<style>")
	})

	// --md --embed
	t.Run("--embed appends frontmatter as HTML comment", func(t *testing.T) {
		r := run(tmpFile, "--embed")
		assertContains(t, r.stdout, "<!-- frontmatter")
		assertContains(t, r.stdout, "-->")
		re := regexp.MustCompile(`<!-- frontmatter\n([\s\S]*?)\n-->`)
		m := re.FindStringSubmatch(r.stdout)
		if m == nil {
			t.Fatal("frontmatter comment block not found")
		}
		var data map[string]any
		if err := json.Unmarshal([]byte(m[1]), &data); err != nil {
			t.Fatalf("invalid JSON in comment: %v", err)
		}
		assertEqual(t, data["title"], "Test Doc")
		// comment appears after body content
		if strings.Index(r.stdout, "Count: 2") > strings.Index(r.stdout, "<!-- frontmatter") {
			t.Fatal("frontmatter comment should appear after body content")
		}
	})

	// --json
	t.Run("--json outputs valid JSON matching frontmatter", func(t *testing.T) {
		r := run(tmpFile, "--json")
		assertEqual(t, r.code, 0)
		var data map[string]any
		if err := json.Unmarshal([]byte(r.stdout), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		assertEqual(t, data["title"], "Test Doc")
		assertEqual(t, data["count"], float64(2))
	})

	t.Run("--json ignores --embed flag", func(t *testing.T) {
		r := run(tmpFile, "--json", "--embed")
		var data map[string]any
		if err := json.Unmarshal([]byte(r.stdout), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		assertEqual(t, data["title"], "Test Doc")
		assertNotContains(t, r.stdout, "<!--")
	})

	// --yaml
	t.Run("--yaml outputs valid YAML matching frontmatter", func(t *testing.T) {
		r := run(tmpFile, "--yaml")
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "title: Test Doc")
		assertContains(t, r.stdout, "count: 2")
	})

	t.Run("--yaml ignores --embed flag", func(t *testing.T) {
		r := run(tmpFile, "--yaml", "--embed")
		assertContains(t, r.stdout, "title: Test Doc")
		assertNotContains(t, r.stdout, "<!--")
	})

	// -o
	t.Run("-o writes output to a file", func(t *testing.T) {
		outFile := filepath.Join(t.TempDir(), "out.md")
		r := run(tmpFile, "-o", outFile)
		assertEqual(t, r.code, 0)
		contents, err := os.ReadFile(outFile)
		if err != nil {
			t.Fatal(err)
		}
		assertContains(t, string(contents), "# Test Doc")
	})

	// check subcommand
	t.Run("check exits 0 for valid file", func(t *testing.T) {
		r := run("check", tmpFile)
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "✓")
	})

	t.Run("check exits non-zero for invalid YAML frontmatter", func(t *testing.T) {
		bad := tmpMi(t, "---\n: bad: yaml:\n---\nbody")
		r := run("check", bad)
		assertNotEqual(t, r.code, 0)
	})

	t.Run("check warns on raw HTML-tag-like patterns in scalar values", func(t *testing.T) {
		bad := tmpMi(t, miWithBody(
			"role: \"Document <title> for the page.\"\nnested:\n  s: \"<script>\"\nclean: \"no html here\"",
			"# {{role}}",
		))
		r := run("check", bad)
		assertEqual(t, r.code, 0) // warnings only, not errors
		assertContains(t, r.stdout, "⚠")
		assertContains(t, r.stdout, "raw HTML-tag-like pattern")
		assertContains(t, r.stdout, "role:")
		assertContains(t, r.stdout, "<title>")
		assertContains(t, r.stdout, "nested.s:")
		assertContains(t, r.stdout, "<script>")
		assertContains(t, r.stdout, "neutralized at HTML render time")
	})

	t.Run("check is silent on scalars with no HTML-tag-like patterns", func(t *testing.T) {
		clean := tmpMi(t, miWithBody("a: 1\nb: hello\nc:\n  - one\n  - two", "# body"))
		r := run("check", clean)
		assertEqual(t, r.code, 0)
		if strings.Contains(r.stdout, "⚠") {
			t.Errorf("expected no warnings, got: %s", r.stdout)
		}
	})

	t.Run("check does NOT flag math/comparison-style angle brackets", func(t *testing.T) {
		// `<` followed by space or digit isn't a tag — don't false-positive.
		clean := tmpMi(t, miWithBody("note: \"a < b and 1 > 0\"", "# body"))
		r := run("check", clean)
		assertEqual(t, r.code, 0)
		if strings.Contains(r.stdout, "⚠") {
			t.Errorf("expected no warnings for math, got: %s", r.stdout)
		}
	})

	t.Run("check finds HTML patterns inside array items", func(t *testing.T) {
		bad := tmpMi(t, miWithBody("items:\n  - clean\n  - \"<b>bold</b>\"", "# body"))
		r := run("check", bad)
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "⚠")
		assertContains(t, r.stdout, "items[1]:")
	})

	// --help
	t.Run("--help exits 0 and prints usage", func(t *testing.T) {
		r := run("--help")
		assertEqual(t, r.code, 0)
		assertContains(t, strings.ToLower(r.stdout), "usage")
	})

	t.Run("no arguments exits 0 and prints usage", func(t *testing.T) {
		r := run()
		assertEqual(t, r.code, 0)
		assertContains(t, r.stdout, "Usage")
	})

	// Error cases
	t.Run("non-existent file exits non-zero with error", func(t *testing.T) {
		r := run("/no/such/file.mi")
		assertNotEqual(t, r.code, 0)
		assertContains(t, strings.ToLower(r.stderr), "not found")
	})
}

// ─── test helpers ───────────────────────────────────────────────────────────

func assertEqual(t *testing.T, got, want any) {
	t.Helper()
	if got != want {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func assertNotEqual(t *testing.T, got, notWant any) {
	t.Helper()
	if got == notWant {
		t.Fatalf("got %v, should not equal %v", got, notWant)
	}
}

func assertContains(t *testing.T, s, substr string) {
	t.Helper()
	if !strings.Contains(s, substr) {
		t.Fatalf("expected output to contain %q, got:\n%s", substr, s)
	}
}

func assertNotContains(t *testing.T, s, substr string) {
	t.Helper()
	if strings.Contains(s, substr) {
		t.Fatalf("expected output NOT to contain %q, got:\n%s", substr, s)
	}
}
