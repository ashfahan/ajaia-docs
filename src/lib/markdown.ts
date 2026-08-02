// Pure converter from Tiptap/ProseMirror document JSON to Markdown.
// Kept dependency-free and side-effect-free so it is unit-tested (see
// markdown.test.ts) and can run on client or server. The editor exports by
// passing editor.getJSON() here.

type Mark = { type: string; attrs?: Record<string, unknown> }
type Node = {
  type: string
  attrs?: Record<string, unknown>
  content?: Node[]
  text?: string
  marks?: Mark[]
}

/** Convert a Tiptap doc node to a Markdown string. */
export function tiptapJsonToMarkdown(doc: Node | null | undefined): string {
  if (!doc || !doc.content) return ""
  const blocks = doc.content.map((n) => renderBlock(n)).filter((s) => s !== null)
  return (
    blocks
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  )
}

function renderBlock(node: Node): string | null {
  switch (node.type) {
    case "heading": {
      const level = clampLevel(node.attrs?.level)
      return `${"#".repeat(level)} ${renderInline(node.content)}`
    }
    case "paragraph":
      return renderInline(node.content)
    case "bulletList":
      return renderList(node, "bullet")
    case "orderedList":
      return renderList(node, "ordered")
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((n) => renderBlock(n))
        .filter(Boolean)
        .join("\n\n")
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
    }
    case "codeBlock":
      return "```\n" + (renderInline(node.content) || "") + "\n```"
    case "horizontalRule":
      return "---"
    default:
      // Unknown block: best-effort render of any inline children.
      return node.content ? renderInline(node.content) : ""
  }
}

function renderList(node: Node, kind: "bullet" | "ordered"): string {
  const items = node.content ?? []
  return items
    .map((item, i) => {
      const marker = kind === "ordered" ? `${i + 1}.` : "-"
      // A listItem usually wraps paragraph(s); join their inline text.
      const text = (item.content ?? [])
        .map((child) => (child.type === "paragraph" ? renderInline(child.content) : (renderBlock(child) ?? "")))
        .join(" ")
        .trim()
      return `${marker} ${text}`
    })
    .join("\n")
}

function renderInline(content: Node[] | undefined): string {
  if (!content) return ""
  return content
    .map((node) => {
      if (node.type === "hardBreak") return "  \n"
      if (node.type !== "text" || node.text == null) {
        // nested inline container
        return renderInline(node.content)
      }
      return applyMarks(node.text, node.marks)
    })
    .join("")
}

function applyMarks(text: string, marks: Mark[] | undefined): string {
  if (!marks || marks.length === 0) return text
  let out = text
  // Apply inner-most first; order chosen so output is stable and valid.
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        out = `**${out}**`
        break
      case "italic":
        out = `_${out}_`
        break
      case "code":
        out = `\`${out}\``
        break
      case "strike":
        out = `~~${out}~~`
        break
      case "underline":
        // Markdown has no native underline; preserve intent with an HTML tag,
        // which most Markdown renderers pass through.
        out = `<u>${out}</u>`
        break
      case "link": {
        const href = (mark.attrs?.href as string) ?? ""
        out = `[${out}](${href})`
        break
      }
      default:
        break
    }
  }
  return out
}

function clampLevel(level: unknown): number {
  const n = typeof level === "number" ? level : 1
  return Math.min(6, Math.max(1, n))
}
