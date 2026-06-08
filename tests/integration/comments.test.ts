// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn(),
  AUTH_COOKIE: "ajaia_uid",
}))

vi.mock("@/services/documents", () => ({
  getDocumentForUser: vi.fn(),
}))

vi.mock("@/services/comments", () => ({
  listComments: vi.fn(),
  addComment: vi.fn(),
}))

import * as commentsRoute from "@/app/api/documents/[id]/comments/route"
import { getCurrentUser } from "@/services/auth"
import * as comments from "@/services/comments"
import * as docs from "@/services/documents"
import { ALICE, asMock, jsonReq, params } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/documents/[id]/comments", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await commentsRoute.GET(jsonReq("http://test.local/api/documents/d1/comments", "GET"), params("d1"))
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await commentsRoute.GET(jsonReq("http://test.local/api/documents/d1/comments", "GET"), params("d1"))
    expect(res.status).toBe(404)
  })

  it("200 returns { comments } when the user has access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "viewer" })
    asMock(comments.listComments).mockResolvedValue([{ id: "c1" }])
    const res = await commentsRoute.GET(jsonReq("http://test.local/api/documents/d1/comments", "GET"), params("d1"))
    expect(res.status).toBe(200)
    expect((await res.json()).comments).toEqual([{ id: "c1" }])
    expect(asMock(comments.listComments)).toHaveBeenCalledWith("d1")
  })
})

describe("POST /api/documents/[id]/comments", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await commentsRoute.POST(
      jsonReq("http://test.local/api/documents/d1/comments", "POST", { body: "hi" }),
      params("d1")
    )
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await commentsRoute.POST(
      jsonReq("http://test.local/api/documents/d1/comments", "POST", { body: "hi" }),
      params("d1")
    )
    expect(res.status).toBe(404)
  })

  it("403 when the caller is a viewer", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "viewer" })
    const res = await commentsRoute.POST(
      jsonReq("http://test.local/api/documents/d1/comments", "POST", { body: "hi" }),
      params("d1")
    )
    expect(res.status).toBe(403)
    expect(asMock(comments.addComment)).not.toHaveBeenCalled()
  })

  for (const role of ["commenter", "editor", "owner"] as const) {
    it(`201 when the caller is a ${role}`, async () => {
      asMock(getCurrentUser).mockResolvedValue(ALICE)
      asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role })
      asMock(comments.addComment).mockResolvedValue({ id: "c1", body: "hi" })
      const res = await commentsRoute.POST(
        jsonReq("http://test.local/api/documents/d1/comments", "POST", { body: "hi" }),
        params("d1")
      )
      expect(res.status).toBe(201)
      expect((await res.json()).comment).toEqual({ id: "c1", body: "hi" })
      expect(asMock(comments.addComment)).toHaveBeenCalledWith("d1", ALICE.id, "hi")
    })
  }

  it("400 when the body is empty/whitespace", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "commenter" })
    const res = await commentsRoute.POST(
      jsonReq("http://test.local/api/documents/d1/comments", "POST", { body: "   " }),
      params("d1")
    )
    expect(res.status).toBe(400)
    expect(asMock(comments.addComment)).not.toHaveBeenCalled()
  })
})
