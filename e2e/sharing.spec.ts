import { expect, test } from "@playwright/test"
import { ALICE, BOB, createDocument, deleteOpenDocument, loginAs, setTitle } from "./helpers"

test("owner shares a document and the collaborator sees it", async ({ browser }) => {
  const title = `E2E share ${Date.now()}`

  // Alice creates and shares with Bob as editor.
  const aliceCtx = await browser.newContext()
  const alice = await aliceCtx.newPage()
  await loginAs(alice, ALICE)
  await createDocument(alice)
  await setTitle(alice, title)

  await alice.getByRole("button", { name: "Share" }).click()
  await alice.getByTestId("share-email").fill("bob@ajaia.test")
  // role defaults to "editor"; submit grants access
  await alice.getByTestId("share-submit").click()
  await expect(alice.getByText("bob@ajaia.test")).toBeVisible()

  // Bob, in a separate context, finds it under "Shared with you".
  const bobCtx = await browser.newContext()
  const bob = await bobCtx.newPage()
  await loginAs(bob, BOB)
  const sharedCard = bob.getByRole("link", { name: new RegExp(title) })
  await expect(sharedCard).toBeVisible()
  await sharedCard.click()
  await bob.waitForURL("**/doc/**")
  await expect(bob.getByTestId("doc-title")).toHaveValue(title)

  // Cleanup: Alice closes the share dialog and deletes the document.
  await alice.bringToFront()
  await alice.keyboard.press("Escape")
  await deleteOpenDocument(alice)

  await aliceCtx.close()
  await bobCtx.close()
})
