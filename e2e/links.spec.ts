import { expect, test } from "@playwright/test"
import { ALICE, createDocument, deleteOpenDocument, loginAs, setTitle, typeBody } from "./helpers"

test("owner creates a shareable link", async ({ page }) => {
  const title = `E2E link ${Date.now()}`

  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, title)
  await typeBody(page, "Body for link test")

  await page.getByRole("button", { name: "Share" }).click()
  await page.getByRole("button", { name: "Create link" }).click()

  // The link section renders the URL as plain text containing "/share/".
  await expect(page.getByText(/\/share\//).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Revoke" })).toBeVisible()

  await page.keyboard.press("Escape")
  await deleteOpenDocument(page)
})

test("anyone with the link can view (read-only) when logged out", async ({ page, browser }) => {
  const title = `E2E public link ${Date.now()}`
  const bodyLine = `Public body ${Date.now()}`

  await loginAs(page, ALICE)
  await createDocument(page)
  await setTitle(page, title)
  await typeBody(page, bodyLine)

  await page.getByRole("button", { name: "Share" }).click()
  await page.getByRole("button", { name: "Create link" }).click()

  // The URL is rendered as text like "https://host/share/<token>"; read it and pull the path.
  const linkText = await page
    .getByText(/\/share\//)
    .first()
    .textContent()
  const match = linkText?.match(/\/share\/[^\s]+/)
  expect(match).not.toBeNull()
  const sharePath = match![0]

  // Visit the link from a fresh, logged-out context.
  const guestCtx = await browser.newContext()
  const newPage = await guestCtx.newPage()
  await newPage.goto(sharePath)

  await expect(newPage.getByText(bodyLine)).toBeVisible()
  // Read-only view has no editor toolbar.
  await expect(newPage.getByTitle("Bold")).toHaveCount(0)

  await guestCtx.close()

  await page.keyboard.press("Escape")
  await deleteOpenDocument(page)
})
