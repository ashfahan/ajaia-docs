import { expect, test } from "@playwright/test"
import { ALICE, deleteOpenDocument, loginAs } from "./helpers"

test("uploads a markdown file and imports it as formatted rich text", async ({ page }) => {
  await loginAs(page, ALICE)

  await page.locator('input[type="file"]').setInputFiles({
    name: "note.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Heading One\n\n**bold text**\n\n- item one\n- item two\n"),
  })

  // The app navigates to the freshly imported document.
  await page.waitForURL("**/doc/**")

  // Markdown was parsed into real rich-text nodes, not left as raw text.
  await expect(page.locator(".doc-content h1")).toContainText("Heading One")
  await expect(page.locator(".doc-content strong")).toContainText("bold text")
  await expect(page.locator(".doc-content li").first()).toContainText("item one")

  await deleteOpenDocument(page)
})
