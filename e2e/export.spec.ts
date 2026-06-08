import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("exports the document as Markdown", async ({ page, context }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E export ${Date.now()}`)
  await typeBody(page, "exportable content")

  await page.getByRole("button", { name: "Export" }).click()

  const dl = page.waitForEvent("download")
  await page.getByText("Download Markdown").click()
  const download = await dl
  expect(download.suggestedFilename()).toMatch(/\.md$/)

  await deleteOpenDocument(page)
})

test("opens a printable PDF view", async ({ page, context }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E print ${Date.now()}`)
  await typeBody(page, "printable content")

  await page.getByRole("button", { name: "Export" }).click()

  const popupPromise = context.waitForEvent("page")
  await page.getByText("Download PDF").click()
  const popup = await popupPromise
  popup.on("dialog", (d) => d.dismiss())
  await popup.waitForLoadState()

  expect(popup.url()).toContain("/print")
  await expect(popup.locator(".doc-content")).toContainText("printable content")
  await popup.close()

  await deleteOpenDocument(page)
})
