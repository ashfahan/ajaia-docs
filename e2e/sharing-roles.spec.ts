import { expect, test } from "@playwright/test"
import { ALICE, BOB, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("shares as viewer; collaborator signs in and gets read-only access", async ({ page }) => {
  const title = `E2E roles ${Date.now()}`

  // Alice creates a document and shares it with Bob as a viewer.
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, title)
  await typeBody(page, "shared content")

  await page.getByRole("button", { name: "Share" }).click()

  // Base UI Select: open the trigger, then click the desired option.
  await page.getByTestId("share-role").click()
  await page.getByRole("option", { name: "Viewer" }).click()

  await page.getByTestId("share-email").fill("bob@ajaia.test")
  await page.getByTestId("share-submit").click()
  await expect(page.getByText("bob@ajaia.test")).toBeVisible()

  // Close the dialog and sign Alice out from the dashboard.
  await page.keyboard.press("Escape")
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL("**/login")

  // Bob signs in and opens the shared document.
  await loginAs(page, BOB)
  const sharedLink = page.getByRole("link", { name: new RegExp(title) })
  await expect(sharedLink).toBeVisible()
  await sharedLink.click()
  await page.waitForURL("**/doc/**")

  // Viewer access is read-only: title disabled and no formatting toolbar.
  await expect(page.getByTestId("doc-title")).toBeDisabled()
  await expect(page.getByTitle("Bold")).toHaveCount(0)

  // Cleanup: Bob signs out, Alice signs back in and deletes the document.
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Sign out" }).click()
  await page.waitForURL("**/login")

  await loginAs(page, ALICE)
  const ownerLink = page.getByRole("link", { name: new RegExp(title) })
  await expect(ownerLink).toBeVisible()
  await ownerLink.click()
  await page.waitForURL("**/doc/**")
  await deleteOpenDocument(page)
})
