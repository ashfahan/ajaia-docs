import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("post a comment and see it in the side panel", async ({ page }) => {
  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, `E2E comments ${Date.now()}`)
  await typeBody(page, "body text")

  await page.getByRole("button", { name: "Comments" }).click()

  const panel = page.getByTestId("comments-panel")
  await expect(panel).toBeVisible()

  await panel.locator("textarea").fill("First comment from Alice")
  await page.getByRole("button", { name: "Comment", exact: true }).click()

  await expect(panel.getByText("First comment from Alice")).toBeVisible()

  await page.keyboard.press("Escape")
  await deleteOpenDocument(page)
})
