// Package markedin parses and renders .mi (markedin) files.
//
// A .mi file has YAML frontmatter between --- delimiters followed by a
// Markdown body with template expressions that reference the frontmatter.
package markedin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"gopkg.in/yaml.v3"
)

// Document holds the parsed frontmatter and body of a .mi file.
type Document struct {
	Data map[string]any
	Body string
}

// Parse extracts YAML frontmatter and body from source.
func Parse(source string) (*Document, error) {
	// Empty frontmatter: ---\n---
	if m := reEmptyFM.FindStringSubmatch(source); m != nil {
		return &Document{Data: map[string]any{}, Body: m[1]}, nil
	}

	m := reFM.FindStringSubmatch(source)
	if m == nil {
		return &Document{Data: map[string]any{}, Body: source}, nil
	}

	var data any
	if err := yaml.Unmarshal([]byte(m[1]), &data); err != nil {
		return nil, err
	}

	dm, ok := data.(map[string]any)
	if !ok {
		dm = map[string]any{}
	}

	return &Document{Data: dm, Body: m[2]}, nil
}

// Render parses source and returns the rendered Markdown with all template
// expressions resolved. If embed is true, frontmatter is appended as an
// HTML comment.
func Render(source string, opts ...RenderOption) (string, error) {
	cfg := applyOpts(opts)
	doc, err := Parse(source)
	if err != nil {
		return "", err
	}
	out := renderTemplate(doc.Body, doc.Data)
	if cfg.embed {
		b, _ := json.MarshalIndent(doc.Data, "", "  ")
		out = strings.TrimRight(out, "\n") + "\n\n<!-- frontmatter\n" + string(b) + "\n-->\n"
	}
	return out, nil
}

// RenderHTMLFrag parses source and returns an HTML fragment (no document wrapper).
func RenderHTMLFrag(source string) (string, error) {
	md, err := Render(source)
	if err != nil {
		return "", err
	}
	return markdownToHTML(md)
}

// RenderHTML parses source and returns a full HTML document.
// If embed is true, frontmatter is included as a JSON script tag in <head>.
func RenderHTML(source string, opts ...RenderOption) (string, error) {
	cfg := applyOpts(opts)
	doc, err := Parse(source)
	if err != nil {
		return "", err
	}
	rendered := renderTemplate(doc.Body, doc.Data)
	body, err := markdownToHTML(rendered)
	if err != nil {
		return "", err
	}
	title, _ := doc.Data["title"].(string)
	dataBlock := ""
	if cfg.embed {
		b, _ := json.MarshalIndent(doc.Data, "", "  ")
		dataBlock = fmt.Sprintf("\n<script type=\"application/json\" id=\"frontmatter\">\n%s\n</script>", string(b))
	}
	return fmt.Sprintf(`<!doctype html>
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
</html>`, title, dataBlock, body), nil
}

// RenderOption configures rendering behavior.
type RenderOption func(*renderConfig)

type renderConfig struct {
	embed bool
}

// WithEmbed enables embedding frontmatter in the output.
func WithEmbed() RenderOption {
	return func(c *renderConfig) { c.embed = true }
}

func applyOpts(opts []RenderOption) renderConfig {
	var cfg renderConfig
	for _, o := range opts {
		o(&cfg)
	}
	return cfg
}

func markdownToHTML(markdown string) (string, error) {
	var buf bytes.Buffer
	md := goldmark.New(goldmark.WithExtensions(extension.Table))
	if err := md.Convert([]byte(markdown), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// ─── regex ──────────────────────────────────────────────────────────────────

var (
	reEmptyFM     = regexp.MustCompile(`(?s)\A---\r?\n---\r?\n?([\s\S]*)\z`)
	reFM          = regexp.MustCompile(`(?s)\A---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)\z`)
	reEscape      = regexp.MustCompile(`\\\{\{`)
	reEachOpen    = regexp.MustCompile(`\{\{#each ([\w.\[\]]+)\}\}`)
	reEachNested  = regexp.MustCompile(`\{\{#each [\w.\[\]]+\}\}`)
	reIfOpen      = regexp.MustCompile(`\{\{#if ([\w.\[\]]+)\}\}`)
	reIfNested    = regexp.MustCompile(`\{\{#if [\w.\[\]]+\}\}`)
	reIfElseEnd   = regexp.MustCompile(`\{\{#if [\w.\[\]]+\}\}|\{\{/if\}\}|\{\{else\}\}`)
	rePartial     = regexp.MustCompile(`\{\{> ?([\w.\[\]]+)\}\}`)
	reInterpolate = regexp.MustCompile(`\{\{([\w.\[\]@]+)\}\}`)
)

// ─── path resolution ────────────────────────────────────────────────────────

var reArrayIdx = regexp.MustCompile(`\[(\d+)\]`)

func resolvePath(obj any, path string) any {
	// Normalise array[0] → array.0
	path = reArrayIdx.ReplaceAllString(path, ".$1")
	parts := strings.Split(path, ".")

	cur := obj
	for _, part := range parts {
		if cur == nil {
			return nil
		}
		switch v := cur.(type) {
		case map[string]any:
			cur = v[part]
		case []any:
			idx, err := strconv.Atoi(part)
			if err != nil || idx < 0 || idx >= len(v) {
				return nil
			}
			cur = v[idx]
		default:
			return nil
		}
	}
	return cur
}

// ─── template rendering ─────────────────────────────────────────────────────

func renderTemplate(template string, ctx map[string]any) string {
	// STX/ETX token protection — same approach as the JS implementation.
	registry := map[string]string{}
	seq := 0

	protect := func(s string) string {
		tok := fmt.Sprintf("\x02%d\x03", seq)
		seq++
		registry[tok] = s
		return tok
	}

	restore := func(s string) string {
		// Reverse order: higher seq first.
		for i := seq - 1; i >= 0; i-- {
			tok := fmt.Sprintf("\x02%d\x03", i)
			if val, ok := registry[tok]; ok {
				s = strings.ReplaceAll(s, tok, val)
			}
		}
		return s
	}

	out := template

	// 0. \{{ → protect as literal {{
	out = reEscape.ReplaceAllStringFunc(out, func(match string) string {
		return protect("{{")
	})

	// 1. {{#each key}} … {{/each}}
	out = processBlocks(out, reEachOpen, reEachNested, "{{/each}}", func(key, inner string) string {
		val := resolvePath(ctx, key)
		arr, ok := val.([]any)
		if !ok {
			return protect("")
		}
		var sb strings.Builder
		for i, item := range arr {
			itemCtx := copyMap(ctx)
			itemCtx["this"] = item
			itemCtx["@index"] = i
			itemCtx["@first"] = i == 0
			itemCtx["@last"] = i == len(arr)-1
			if m, ok := item.(map[string]any); ok {
				for k, v := range m {
					itemCtx[k] = v
				}
			}
			sb.WriteString(renderTemplate(inner, itemCtx))
		}
		return protect(sb.String())
	})

	// 2. {{#if key}} … {{else}} … {{/if}}
	out = processBlocks(out, reIfOpen, reIfNested, "{{/if}}", func(key, inner string) string {
		val := resolvePath(ctx, key)
		elseIdx := findTopLevelElse(inner)
		var truthy, falsy string
		if elseIdx == -1 {
			truthy = inner
		} else {
			truthy = inner[:elseIdx]
			falsy = inner[elseIdx+len("{{else}}"):]
		}
		if isTruthy(val) {
			return protect(renderTemplate(truthy, ctx))
		}
		return protect(renderTemplate(falsy, ctx))
	})

	// 3. {{> partial}}
	out = rePartial.ReplaceAllStringFunc(out, func(match string) string {
		m := rePartial.FindStringSubmatch(match)
		val := resolvePath(ctx, m[1])
		if val == nil {
			return ""
		}
		return protect(fmt.Sprintf("%v", val))
	})

	// 4. {{key}} scalar interpolation
	out = reInterpolate.ReplaceAllStringFunc(out, func(match string) string {
		m := reInterpolate.FindStringSubmatch(match)
		val := resolvePath(ctx, m[1])
		if val == nil {
			return ""
		}
		return protect(formatValue(val))
	})

	return restore(out)
}

// processBlocks walks left-to-right through the string, finds matching
// open/close pairs with depth counting, and calls fn(key, inner) for each.
func processBlocks(s string, openRe, nestedOpenRe *regexp.Regexp, closeTag string, fn func(key, inner string) string) string {
	var result strings.Builder
	lastEnd := 0

	for {
		loc := openRe.FindStringSubmatchIndex(s[lastEnd:])
		if loc == nil {
			break
		}
		// Adjust indices to absolute positions.
		matchStart := lastEnd + loc[0]
		matchEnd := lastEnd + loc[1]
		key := s[lastEnd+loc[2] : lastEnd+loc[3]]

		closeIdx := findClose(s, nestedOpenRe, closeTag, matchEnd)
		if closeIdx == -1 {
			// No matching close — skip this open tag.
			lastEnd = matchEnd
			continue
		}

		inner := s[matchEnd:closeIdx]
		result.WriteString(s[lastEnd:matchStart])
		result.WriteString(fn(key, inner))
		lastEnd = closeIdx + len(closeTag)
	}

	result.WriteString(s[lastEnd:])
	return result.String()
}

// findClose finds the closing tag matching the opening at depth 1.
func findClose(s string, nestedOpenRe *regexp.Regexp, closeTag string, from int) int {
	depth := 1
	pos := from
	for depth > 0 {
		closeIdx := strings.Index(s[pos:], closeTag)
		if closeIdx == -1 {
			return -1
		}
		closeIdx += pos

		// Count nested opens between pos and closeIdx.
		segment := s[pos:closeIdx]
		nested := nestedOpenRe.FindAllStringIndex(segment, -1)
		depth += len(nested)

		depth--
		if depth == 0 {
			return closeIdx
		}
		pos = closeIdx + len(closeTag)
	}
	return -1
}

// findTopLevelElse finds {{else}} at the top level of content (not inside nested #if).
func findTopLevelElse(content string) int {
	matches := reIfElseEnd.FindAllStringSubmatchIndex(content, -1)
	depth := 0
	for _, m := range matches {
		tag := content[m[0]:m[1]]
		if strings.HasPrefix(tag, "{{#if ") {
			depth++
		} else if tag == "{{/if}}" {
			depth--
		} else if tag == "{{else}}" && depth == 0 {
			return m[0]
		}
	}
	return -1
}

// isTruthy mirrors the JS truthiness rules for .mi templates.
func isTruthy(val any) bool {
	if val == nil {
		return false
	}
	switch v := val.(type) {
	case bool:
		return v
	case int:
		return v != 0
	case float64:
		return v != 0
	case string:
		return v != ""
	case []any:
		return len(v) > 0
	case map[string]any:
		return len(v) > 0
	default:
		return true
	}
}

// formatValue converts a value to its string representation for interpolation.
func formatValue(val any) string {
	switch v := val.(type) {
	case string:
		return v
	case bool:
		if v {
			return "true"
		}
		return "false"
	case int:
		return strconv.Itoa(v)
	case float64:
		if v == float64(int(v)) {
			return strconv.Itoa(int(v))
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	case []any:
		parts := make([]string, len(v))
		for i, item := range v {
			parts[i] = fmt.Sprintf("%v", item)
		}
		return strings.Join(parts, ", ")
	case map[string]any:
		b, _ := json.Marshal(v)
		return string(b)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func copyMap(m map[string]any) map[string]any {
	cp := make(map[string]any, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}
