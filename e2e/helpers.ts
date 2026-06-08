import { type Page, expect } from "@playwright/test"

// Shared e2e helpers. Login is passwordless (seeded demo users), so signing in
// is just clicking the user's button on the login screen.

export const ALICE = /Alice/
export const BOB = /Bob/

export async function loginAs(page: Page, displayNameMatch: RegExp) {
  await page.goto("/login")
  await page.getByRole("button", { name: displayNameMatch }).click()
  await page.waitForURL("**/dashboard")
}

export async function createDocument(page: Page): Promise<string> {
  await page.getByRole("button", { name: "New document" }).click()
  await page.waitForURL("**/doc/**")
  const url = new URL(page.url())
  return url.pathname.split("/").pop()!
}

export async function setTitle(page: Page, title: string) {
  const input = page.getByTestId("doc-title")
  await input.fill(title)
  await input.blur()
  await expect(page.getByText("Saved")).toBeVisible()
}

export async function typeBody(page: Page, text: string) {
  const editor = page.locator(".doc-content")
  await editor.click()
  await page.keyboard.type(text)
  await expect(page.getByText("Saved")).toBeVisible()
}

// Owner-only: deletes the currently open document (handles the confirm dialog).
export async function deleteOpenDocument(page: Page) {
  page.once("dialog", (d) => d.accept())
  await page.getByRole("button", { name: "Delete" }).click()
  await page.waitForURL("**/dashboard")
}
