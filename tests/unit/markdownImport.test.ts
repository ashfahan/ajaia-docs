import { markdownToHtml } from "@/lib/markdownImport"
import { describe, expect, it } from "vitest"

describe("markdownToHtml", () => {
  it("converts a heading to <h1>", () => {
    expect(markdownToHtml("# Title")).toContain("<h1>")
  })

  it("converts **bold** to <strong>", () => {
    expect(markdownToHtml("**bold**")).toContain("<strong>")
  })

  it("converts a bullet list to <ul> and <li>", () => {
    const html = markdownToHtml("- one\n- two")
    expect(html).toContain("<ul>")
    expect(html).toContain("<li>")
  })

  it("converts a link to <a> with href", () => {
    const html = markdownToHtml("[link](https://x.com)")
    expect(html).toContain("<a")
    expect(html).toContain('href="https://x.com"')
  })

  it("strips XSS payloads (<script> and onerror)", () => {
    const html = markdownToHtml("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("onerror")
  })

  it("returns <p></p> for empty input", () => {
    expect(markdownToHtml("")).toBe("<p></p>")
    expect(markdownToHtml("   ")).toBe("<p></p>")
  })
})
