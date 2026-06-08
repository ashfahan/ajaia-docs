import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle } from "./helpers"

test("upload a file attachment and see it listed", async ({ page }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E files ${Date.now()}`)

  await page.getByRole("button", { name: "Files" }).click()
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: "report.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("attachment body"),
  })

  await expect(page.getByText("report.txt")).toBeVisible()
  await expect(page.getByRole("link", { name: /Download/i }).first()).toBeVisible()

  await page.keyboard.press("Escape")
  await deleteOpenDocument(page)
})
