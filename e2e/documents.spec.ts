import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("create, edit, and persist a document across reload", async ({ page }) => {
  await loginAs(page, ALICE)

  await createDocument(page)
  const title = `E2E persist ${Date.now()}`
  await setTitle(page, title)
  await typeBody(page, "Persistence check body")

  // Reload and confirm both title and body survived (real DB round-trip).
  await page.reload()
  await expect(page.getByTestId("doc-title")).toHaveValue(title)
  await expect(page.locator(".doc-content")).toContainText("Persistence check body")

  await deleteOpenDocument(page)
  await expect(page.getByText(title)).toHaveCount(0)
})

test("rich-text formatting renders in the editor", async ({ page }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E format ${Date.now()}`)

  const editor = page.locator(".doc-content")
  await editor.click()
  await page.keyboard.type("bold me")
  await editor.click({ clickCount: 3 }) // select the paragraph (cross-platform)
  await page.getByTitle("Bold").click()
  await expect(editor.locator("strong")).toHaveText("bold me")

  await deleteOpenDocument(page)
})
