/**
 * Markdown import utility.
 *
 * Converts the contents of an uploaded `.md` file into safe rich-text HTML
 * suitable for storing on a document and rendering inside the Tiptap editor.
 *
 * Two-step pipeline:
 *   1. `marked` parses the raw markdown into HTML.
 *   2. `sanitize-html` strips everything except the small set of tags/attributes
 *      that the Tiptap editor supports (plus safe basics). This makes the result
 *      XSS-safe: `<script>`, inline event handlers (e.g. `onclick`/`onerror`),
 *      `<img>`, etc. are all removed before the HTML is ever stored or rendered.
 *
 * The function is pure: same input -> same output, no side effects.
 */

import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

// Tags the Tiptap editor in this app supports, plus safe formatting basics.
const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "br",
  "a",
]

export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === "") {
    return "<p></p>"
  }

  // Synchronous parse: `async: false` guarantees a string return, not a Promise.
  const rawHtml = marked.parse(markdown, { async: false }) as string

  const safeHtml = sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Disallow all other attributes (onclick, src, style, etc.) by omission.
  })

  return safeHtml
}
