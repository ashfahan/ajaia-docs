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

import * as documentsRoute from "@/app/api/documents/route"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import { ALICE, asMock, jsonReq } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET/POST /api/documents", () => {
  it("401 when not authenticated", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await documentsRoute.GET()
    expect(res.status).toBe(401)
  })

  it("returns owned + shared lists for an authenticated user", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.listDocumentsForUser).mockResolvedValue({
      owned: [{ id: "d1", title: "Mine" }],
      shared: [{ id: "d2", title: "Theirs", shared_role: "editor" }],
    })
    const res = await documentsRoute.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owned).toHaveLength(1)
    expect(body.shared[0].shared_role).toBe("editor")
  })

  it("creates a document (201)", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.createDocument).mockResolvedValue({
      id: "new",
      title: "Untitled document",
    })
    const res = await documentsRoute.POST(jsonReq("http://test.local/api/documents", "POST", {}))
    expect(res.status).toBe(201)
    expect(asMock(docs.createDocument)).toHaveBeenCalledWith(ALICE.id, "Untitled document")
  })
})
