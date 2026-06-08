// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn(),
  AUTH_COOKIE: "ajaia_uid",
}))

// The PATCH route snapshots a version on save; stub it out here (it is its
// own concern, server-only, and not what these route tests exercise).
vi.mock("@/services/versions", () => ({
  snapshotVersion: vi.fn(),
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

import * as docByIdRoute from "@/app/api/documents/[id]/route"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import { ALICE, asMock, jsonReq, params } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET/PATCH/DELETE /api/documents/[id]", () => {
  beforeEach(() => asMock(getCurrentUser).mockResolvedValue(ALICE))

  it("404 when the user has no access", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await docByIdRoute.GET(jsonReq("http://test.local/api/documents/doc-1", "GET"), params("d1"))
    expect(res.status).toBe(404)
  })

  it("200 with the caller role on read", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", title: "X", owner_id: ALICE.id },
      role: "owner",
    })
    const res = await docByIdRoute.GET(jsonReq("http://test.local/api/documents/doc-1", "GET"), params("d1"))
    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe("owner")
  })

  it("403 when a viewer tries to edit", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: "someone" },
      role: "viewer",
    })
    const res = await docByIdRoute.PATCH(
      jsonReq("http://test.local/api/documents/doc-1", "PATCH", {
        content_html: "<p>hi</p>",
      }),
      params("d1")
    )
    expect(res.status).toBe(403)
    expect(asMock(docs.updateDocument)).not.toHaveBeenCalled()
  })

  it("editor can save content (200)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: "someone" },
      role: "editor",
    })
    asMock(docs.updateDocument).mockResolvedValue({
      id: "d1",
      content_html: "<p>hi</p>",
    })
    const res = await docByIdRoute.PATCH(
      jsonReq("http://test.local/api/documents/doc-1", "PATCH", {
        content_html: "<p>hi</p>",
      }),
      params("d1")
    )
    expect(res.status).toBe(200)
    expect(asMock(docs.updateDocument)).toHaveBeenCalled()
  })

  it("rejects an empty title (400)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: ALICE.id },
      role: "owner",
    })
    const res = await docByIdRoute.PATCH(
      jsonReq("http://test.local/api/documents/doc-1", "PATCH", {
        title: "   ",
      }),
      params("d1")
    )
    expect(res.status).toBe(400)
  })

  it("only the owner can delete (403 for editor)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: "someone" },
      role: "editor",
    })
    const res = await docByIdRoute.DELETE(jsonReq("http://test.local/api/documents/doc-1", "DELETE"), params("d1"))
    expect(res.status).toBe(403)
    expect(asMock(docs.deleteDocument)).not.toHaveBeenCalled()
  })

  it("owner can delete (200)", async () => {
    asMock(docs.getDocumentForUser).mockResolvedValue({
      doc: { id: "d1", owner_id: ALICE.id },
      role: "owner",
    })
    asMock(docs.deleteDocument).mockResolvedValue(undefined)
    const res = await docByIdRoute.DELETE(jsonReq("http://test.local/api/documents/doc-1", "DELETE"), params("d1"))
    expect(res.status).toBe(200)
  })
})
