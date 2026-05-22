// mi — markedin CLI
//
// Usage:
//
//	mi <file.mi> [--md|--html|--json|--yaml] [--embed] [-o <file>]
//	mi check <file.mi>
//	mi --help
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"

	"github.com/stonebraker/markedin/parsers/go"
	"gopkg.in/yaml.v3"
)

const usage = `Usage:
  mi <file.mi> [options]    Render a .mi file
  mi check <file.mi>        Validate frontmatter and report structure
  mi --help                 Show this help

Output format (default: --md):
  --md        Rendered markdown
  --html      Full HTML document
  --html-frag HTML fragment (body content only, no wrapper)
  --json      Frontmatter as JSON
  --yaml      Frontmatter as YAML

Options:
  --embed   Append frontmatter as a comment in the output
            For --md: HTML comment at the bottom
            For --html: <script type="application/json"> in <head>
            Ignored when used with --json or --yaml
  -o <file> Write output to a file instead of stdout`

func main() {
	args := os.Args[1:]

	if len(args) == 0 || hasFlag(args, "--help") || hasFlag(args, "-h") {
		fmt.Println(usage)
		os.Exit(0)
	}

	// check subcommand
	if args[0] == "check" {
		runCheck(args[1:])
		return
	}

	// Find file path (first non-flag argument)
	filePath := ""
	for i, a := range args {
		if !strings.HasPrefix(a, "-") {
			filePath = a
			break
		}
		// Skip -o's argument
		if a == "-o" {
			i++
			_ = i
		}
	}
	if filePath == "" {
		fmt.Println(usage)
		os.Exit(0)
	}

	source, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "File not found: %s\n", filePath)
		os.Exit(1)
	}

	doc, err := markedin.Parse(string(source))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Parse error: %s\n", err)
		os.Exit(1)
	}

	flags := flagSet(args)
	outFile := flagValue(args, "-o")

	var output string

	var opts []markedin.RenderOption
	if flags["--embed"] {
		opts = append(opts, markedin.WithEmbed())
	}

	switch {
	case flags["--json"]:
		b, _ := json.MarshalIndent(doc.Data, "", "  ")
		output = string(b) + "\n"

	case flags["--yaml"]:
		b, _ := yaml.Marshal(doc.Data)
		output = string(b)

	case flags["--html-frag"]:
		rendered, err := markedin.RenderHTMLFrag(string(source))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Render error: %s\n", err)
			os.Exit(1)
		}
		output = rendered

	case flags["--html"]:
		rendered, err := markedin.RenderHTML(string(source), opts...)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Render error: %s\n", err)
			os.Exit(1)
		}
		output = rendered

	default:
		// --md (default)
		rendered, err := markedin.Render(string(source), opts...)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Render error: %s\n", err)
			os.Exit(1)
		}
		output = rendered
	}

	if outFile != "" {
		if err := os.WriteFile(outFile, []byte(output), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "Write error: %s\n", err)
			os.Exit(1)
		}
	} else {
		fmt.Print(output)
	}
}

func runCheck(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Usage: mi check <file.mi>")
		os.Exit(1)
	}
	filePath := args[0]
	source, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "File not found: %s\n", filePath)
		os.Exit(1)
	}
	doc, err := markedin.Parse(string(source))
	if err != nil {
		fmt.Fprintf(os.Stderr, "✗ Parse error: %s\n", err)
		os.Exit(1)
	}
	fmt.Printf("✓ Frontmatter OK — %d key(s)\n", len(doc.Data))
	lines := strings.Count(doc.Body, "\n") + 1
	if doc.Body == "" {
		lines = 0
	}
	fmt.Printf("✓ Body: %d line(s)\n", lines)

	// Defense-in-depth lint: surface raw HTML-tag-like patterns in scalar
	// values. The renderer neutralizes these at HTML-render time per SPEC.md
	// 0.4.3 (escaped to entities by JS/Python, stripped with a comment by Go),
	// but wrapping HTML element names in backticks reads more clearly in
	// source and renders as inline code in HTML output.
	findings := scanRawHTMLLikeScalars(doc.Data)
	if len(findings) > 0 {
		sort.Strings(findings)
		fmt.Printf("⚠ %d raw HTML-tag-like pattern(s) in scalar value(s):\n", len(findings))
		for _, f := range findings {
			fmt.Printf("  - %s\n", f)
		}
		fmt.Println("  (neutralized at HTML render time; consider wrapping in backticks for readability)")
	}
}

// rawHTMLTagRe matches `<word…>` or `</word…>` sequences that the HTML
// parser would interpret as a tag. Conservative: requires an alphabetic
// character right after the `<` or `</` so we don't flag math/comparisons.
var rawHTMLTagRe = regexp.MustCompile(`<\/?[A-Za-z][^<>]*>`)

// scanRawHTMLLikeScalars walks the frontmatter data and returns "path: snippet"
// findings for any string scalar containing a raw HTML-tag-like pattern.
func scanRawHTMLLikeScalars(data map[string]any) []string {
	var out []string
	var walk func(prefix string, v any)
	walk = func(prefix string, v any) {
		switch val := v.(type) {
		case string:
			if m := rawHTMLTagRe.FindString(val); m != "" {
				out = append(out, fmt.Sprintf("%s: %q", prefix, m))
			}
		case map[string]any:
			for k, child := range val {
				p := k
				if prefix != "" {
					p = prefix + "." + k
				}
				walk(p, child)
			}
		case []any:
			for i, child := range val {
				walk(fmt.Sprintf("%s[%d]", prefix, i), child)
			}
		}
	}
	for k, v := range data {
		walk(k, v)
	}
	return out
}

func hasFlag(args []string, flag string) bool {
	for _, a := range args {
		if a == flag {
			return true
		}
	}
	return false
}

func flagSet(args []string) map[string]bool {
	m := map[string]bool{}
	for _, a := range args {
		if strings.HasPrefix(a, "-") {
			m[a] = true
		}
	}
	return m
}

func flagValue(args []string, flag string) string {
	for i, a := range args {
		if a == flag && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}
