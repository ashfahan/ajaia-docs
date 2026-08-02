// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn(),
  AUTH_COOKIE: "ajaia_uid",
}))

vi.mock("@/services/documents", () => ({
  getDocumentForUser: vi.fn(),
}))

vi.mock("@/services/links", () => ({
  listLinks: vi.fn(),
  createLink: vi.fn(),
}))

import * as linksRoute from "@/app/api/documents/[id]/links/route"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import * as links from "@/services/links"
import { ALICE, asMock, jsonReq, params } from "./helpers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/documents/[id]/links", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await linksRoute.GET(jsonReq("http://test.local/api/documents/d1/links", "GET"), params("d1"))
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await linksRoute.GET(jsonReq("http://test.local/api/documents/d1/links", "GET"), params("d1"))
    expect(res.status).toBe(404)
  })

  it("403 when the caller is not the owner", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "editor" })
    const res = await linksRoute.GET(jsonReq("http://test.local/api/documents/d1/links", "GET"), params("d1"))
    expect(res.status).toBe(403)
    expect(asMock(links.listLinks)).not.toHaveBeenCalled()
  })

  it("200 returns { links } for the owner", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "owner" })
    asMock(links.listLinks).mockResolvedValue([{ token: "t1" }])
    const res = await linksRoute.GET(jsonReq("http://test.local/api/documents/d1/links", "GET"), params("d1"))
    expect(res.status).toBe(200)
    expect((await res.json()).links).toEqual([{ token: "t1" }])
    expect(asMock(links.listLinks)).toHaveBeenCalledWith("d1")
  })
})

describe("POST /api/documents/[id]/links", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await linksRoute.POST(
      jsonReq("http://test.local/api/documents/d1/links", "POST", { role: "viewer" }),
      params("d1")
    )
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await linksRoute.POST(
      jsonReq("http://test.local/api/documents/d1/links", "POST", { role: "viewer" }),
      params("d1")
    )
    expect(res.status).toBe(404)
  })

  it("403 when the caller is not the owner", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "editor" })
    const res = await linksRoute.POST(
      jsonReq("http://test.local/api/documents/d1/links", "POST", { role: "viewer" }),
      params("d1")
    )
    expect(res.status).toBe(403)
    expect(asMock(links.createLink)).not.toHaveBeenCalled()
  })

  it("201 returns { link } for the owner", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "owner" })
    asMock(links.createLink).mockResolvedValue({ token: "t1", role: "commenter" })
    const res = await linksRoute.POST(
      jsonReq("http://test.local/api/documents/d1/links", "POST", { role: "commenter" }),
      params("d1")
    )
    expect(res.status).toBe(201)
    expect((await res.json()).link).toEqual({ token: "t1", role: "commenter" })
    expect(asMock(links.createLink)).toHaveBeenCalledWith("d1", "commenter", ALICE.id)
  })

  it("defaults to the viewer role when none is provided", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "owner" })
    asMock(links.createLink).mockResolvedValue({ token: "t1", role: "viewer" })
    const res = await linksRoute.POST(jsonReq("http://test.local/api/documents/d1/links", "POST", {}), params("d1"))
    expect(res.status).toBe(201)
    expect(asMock(links.createLink)).toHaveBeenCalledWith("d1", "viewer", ALICE.id)
  })

  it("accepts the editor role", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "owner" })
    asMock(links.createLink).mockResolvedValue({ token: "t1", role: "editor" })
    const res = await linksRoute.POST(
      jsonReq("http://test.local/api/documents/d1/links", "POST", { role: "editor" }),
      params("d1")
    )
    expect(res.status).toBe(201)
    expect(asMock(links.createLink)).toHaveBeenCalledWith("d1", "editor", ALICE.id)
  })
})
