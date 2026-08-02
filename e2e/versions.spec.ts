import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("records a version and can open version history", async ({ page }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E version ${Date.now()}`)

  // Editing snapshots a version of the prior state on save.
  await typeBody(page, "first content")

  await page.getByRole("button", { name: "History" }).click()

  // The VersionHistory dialog renders a "Restore" button per saved version.
  await expect(page.getByRole("button", { name: "Restore" }).first()).toBeVisible()

  await page.keyboard.press("Escape")
  await deleteOpenDocument(page)
})
