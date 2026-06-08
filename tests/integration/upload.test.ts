// @vitest-environment node

import { NextRequest } from "next/server"
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

import * as uploadRoute from "@/app/api/documents/upload/route"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import { ALICE, asMock } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("upload /api/documents/upload", () => {
  beforeEach(() => asMock(getCurrentUser).mockResolvedValue(ALICE))

  it("401 when not authenticated", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const fd = new FormData()
    fd.append("file", new File(["hi"], "note.txt", { type: "text/plain" }))
    const res = await uploadRoute.POST(
      new NextRequest("http://test.local/api/documents/upload", {
        method: "POST",
        body: fd,
      })
    )
    expect(res.status).toBe(401)
  })

  it("rejects an unsupported file type (400)", async () => {
    const fd = new FormData()
    fd.append("file", new File(["x"], "evil.exe", { type: "application/octet-stream" }))
    const res = await uploadRoute.POST(
      new NextRequest("http://test.local/api/documents/upload", {
        method: "POST",
        body: fd,
      })
    )
    expect(res.status).toBe(400)
  })

  it("imports a .txt file into a new document (201)", async () => {
    asMock(docs.createDocumentFromText).mockResolvedValue({
      id: "up",
      title: "note",
    })
    const fd = new FormData()
    fd.append("file", new File(["line one\nline two"], "note.txt", { type: "text/plain" }))
    const res = await uploadRoute.POST(
      new NextRequest("http://test.local/api/documents/upload", {
        method: "POST",
        body: fd,
      })
    )
    expect(res.status).toBe(201)
    expect(asMock(docs.createDocumentFromText)).toHaveBeenCalledWith(ALICE.id, "note", "line one\nline two")
  })
})
