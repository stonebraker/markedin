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
	"path/filepath"
	"strings"

	"github.com/agenticsystems/markedin/parsers/go"
	"gopkg.in/yaml.v3"
)

const usage = `Usage:
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

	switch {
	case flags["--json"]:
		b, _ := json.MarshalIndent(doc.Data, "", "  ")
		output = string(b) + "\n"

	case flags["--yaml"]:
		b, _ := yaml.Marshal(doc.Data)
		output = string(b)

	case flags["--html"]:
		rendered, err := markedin.Render(string(source))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Render error: %s\n", err)
			os.Exit(1)
		}
		title, _ := doc.Data["title"].(string)
		if title == "" {
			title = strings.TrimSuffix(filepath.Base(filePath), ".mi")
		}
		dataBlock := ""
		if flags["--embed"] {
			b, _ := json.MarshalIndent(doc.Data, "", "  ")
			dataBlock = fmt.Sprintf("\n<script type=\"application/json\" id=\"frontmatter\">\n%s\n</script>", string(b))
		}
		output = fmt.Sprintf(`<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>%s</title>%s
<style>
  body { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 1.0625rem; line-height: 1.65; color: #1f2937; }
  h1, h2, h3 { color: #111827; letter-spacing: -.02em; }
  h1 { font-size: 2rem; margin-bottom: .5rem; }
  h2 { font-size: 1.4rem; margin-top: 2.5rem; }
  h3 { font-size: 1.1rem; margin-top: 2rem; }
  code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: .875em; background: #f3f4f6; padding: .1em .35em; border-radius: 3px; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 1.25rem; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%%; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e7eb; }
  th { font-size: .8125rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  a { color: #2563eb; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
</style>
</head>
<body>
%s
</body>
</html>`, title, dataBlock, rendered)

	default:
		// --md (default)
		rendered, err := markedin.Render(string(source))
		if err != nil {
			fmt.Fprintf(os.Stderr, "Render error: %s\n", err)
			os.Exit(1)
		}
		output = rendered
		if flags["--embed"] {
			b, _ := json.MarshalIndent(doc.Data, "", "  ")
			output = strings.TrimRight(output, "\n") + "\n\n<!-- frontmatter\n" + string(b) + "\n-->\n"
		}
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
