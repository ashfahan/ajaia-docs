import { tiptapJsonToMarkdown } from "@/lib/markdown"
import { describe, expect, it } from "vitest"

// Unit tests for the Markdown export converter (the stretch feature).

const doc = (...content: unknown[]) =>
  ({ type: "doc", content }) as unknown as Parameters<typeof tiptapJsonToMarkdown>[0]
const text = (t: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({
  type: "text",
  text: t,
  ...(marks ? { marks } : {}),
})

describe("tiptapJsonToMarkdown", () => {
  it("returns empty string for empty/null docs", () => {
    expect(tiptapJsonToMarkdown(null)).toBe("")
    expect(tiptapJsonToMarkdown({ type: "doc" })).toBe("")
  })

  it("renders headings at the right level", () => {
    const md = tiptapJsonToMarkdown(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
        { type: "heading", attrs: { level: 3 }, content: [text("Sub")] }
      )
    )
    expect(md).toContain("# Title")
    expect(md).toContain("### Sub")
  })

  it("renders paragraphs separated by blank lines", () => {
    const md = tiptapJsonToMarkdown(
      doc({ type: "paragraph", content: [text("First.")] }, { type: "paragraph", content: [text("Second.")] })
    )
    expect(md).toBe("First.\n\nSecond.\n")
  })

  it("applies bold, italic, code and underline marks", () => {
    const md = tiptapJsonToMarkdown(
      doc({
        type: "paragraph",
        content: [
          text("a"),
          text("bold", [{ type: "bold" }]),
          text("italic", [{ type: "italic" }]),
          text("code", [{ type: "code" }]),
          text("u", [{ type: "underline" }]),
        ],
      })
    )
    expect(md).toContain("**bold**")
    expect(md).toContain("_italic_")
    expect(md).toContain("`code`")
    expect(md).toContain("<u>u</u>")
  })

  it("renders bullet and ordered lists", () => {
    const li = (t: string) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [text(t)] }],
    })
    const bullet = tiptapJsonToMarkdown(doc({ type: "bulletList", content: [li("one"), li("two")] }))
    expect(bullet).toContain("- one")
    expect(bullet).toContain("- two")

    const ordered = tiptapJsonToMarkdown(doc({ type: "orderedList", content: [li("first"), li("second")] }))
    expect(ordered).toContain("1. first")
    expect(ordered).toContain("2. second")
  })

  it("handles a realistic mixed document", () => {
    const md = tiptapJsonToMarkdown(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [text("Q3 Plan")] },
        {
          type: "paragraph",
          content: [text("We will "), text("ship", [{ type: "bold" }]), text(" it.")],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [text("editor")] }],
            },
          ],
        }
      )
    )
    expect(md).toBe("# Q3 Plan\n\nWe will **ship** it.\n\n- editor\n")
  })
})
