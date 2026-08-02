// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn(),
  AUTH_COOKIE: "ajaia_uid",
}))

vi.mock("@/services/documents", () => {
  class NotFoundError extends Error {}
  return {
    listDocumentsForUser: vi.fn(),
    createDocument: vi.fn(),
    getDocumentForUser: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocumentShares: vi.fn(),
    revokeShare: vi.fn(),
    shareDocumentByEmail: vi.fn(),
    createDocumentFromText: vi.fn(),
    NotFoundError,
  }
})

import * as shareRoute from "@/app/api/documents/[id]/share/route"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import { ALICE, asMock, jsonReq, params } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("sharing /api/documents/[id]/share", () => {
  beforeEach(() => asMock(getCurrentUser).mockResolvedValue(ALICE))

  it("non-owner cannot share (403)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: "someone" },
      role: "editor",
    })
    const res = await shareRoute.POST(
      jsonReq("http://test.local/api/documents/doc-1", "POST", {
        email: "bob@ajaia.test",
      }),
      params("d1")
    )
    expect(res.status).toBe(403)
  })

  it("owner sharing with an unknown email yields 404", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: ALICE.id },
      role: "owner",
    })
    asMock(docs.shareDocumentByEmail).mockRejectedValue(
      new docs.NotFoundError("No user with that email is registered.")
    )
    const res = await shareRoute.POST(
      jsonReq("http://test.local/api/documents/doc-1", "POST", {
        email: "ghost@ajaia.test",
      }),
      params("d1")
    )
    expect(res.status).toBe(404)
  })

  it("owner shares successfully (200)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: ALICE.id },
      role: "owner",
    })
    asMock(docs.shareDocumentByEmail).mockResolvedValue({
      user: { id: "u-bob", email: "bob@ajaia.test", display_name: "Bob" },
    })
    const res = await shareRoute.POST(
      jsonReq("http://test.local/api/documents/doc-1", "POST", {
        email: "bob@ajaia.test",
        role: "viewer",
      }),
      params("d1")
    )
    expect(res.status).toBe(200)
    expect(asMock(docs.shareDocumentByEmail)).toHaveBeenCalledWith("d1", "bob@ajaia.test", "viewer")
  })
})
