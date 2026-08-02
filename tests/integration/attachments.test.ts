// @vitest-environment node

import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/auth", () => ({
  getCurrentUser: vi.fn(),
  AUTH_COOKIE: "ajaia_uid",
}))

vi.mock("@/services/documents", () => ({
  getDocumentForUser: vi.fn(),
}))

vi.mock("@/services/attachments", () => ({
  listAttachments: vi.fn(),
  addAttachment: vi.fn(),
}))

import * as attachmentsRoute from "@/app/api/documents/[id]/attachments/route"
import * as attachments from "@/services/attachments"
import { getCurrentUser } from "@/services/auth"
import * as docs from "@/services/documents"
import { ALICE, asMock, jsonReq, params } from "./helpers"

const uploadReq = (file?: File) => {
  const fd = new FormData()
  if (file) fd.set("file", file)
  return new NextRequest("http://test.local/api/documents/d1/attachments", { method: "POST", body: fd })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/documents/[id]/attachments", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await attachmentsRoute.GET(
      jsonReq("http://test.local/api/documents/d1/attachments", "GET"),
      params("d1")
    )
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await attachmentsRoute.GET(
      jsonReq("http://test.local/api/documents/d1/attachments", "GET"),
      params("d1")
    )
    expect(res.status).toBe(404)
  })

  it("200 returns { attachments } when the user has access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "viewer" })
    asMock(attachments.listAttachments).mockResolvedValue([{ id: "a1" }])
    const res = await attachmentsRoute.GET(
      jsonReq("http://test.local/api/documents/d1/attachments", "GET"),
      params("d1")
    )
    expect(res.status).toBe(200)
    expect((await res.json()).attachments).toEqual([{ id: "a1" }])
    expect(asMock(attachments.listAttachments)).toHaveBeenCalledWith("d1")
  })
})

describe("POST /api/documents/[id]/attachments", () => {
  it("401 when there is no user", async () => {
    asMock(getCurrentUser).mockResolvedValue(null)
    const res = await attachmentsRoute.POST(
      uploadReq(new File(["data"], "a.txt", { type: "text/plain" })),
      params("d1")
    )
    expect(res.status).toBe(401)
  })

  it("404 when the user has no access", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue(null)
    const res = await attachmentsRoute.POST(
      uploadReq(new File(["data"], "a.txt", { type: "text/plain" })),
      params("d1")
    )
    expect(res.status).toBe(404)
  })

  for (const role of ["commenter", "viewer"] as const) {
    it(`403 when the caller is a ${role}`, async () => {
      asMock(getCurrentUser).mockResolvedValue(ALICE)
      asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role })
      const res = await attachmentsRoute.POST(
        uploadReq(new File(["data"], "a.txt", { type: "text/plain" })),
        params("d1")
      )
      expect(res.status).toBe(403)
      expect(asMock(attachments.addAttachment)).not.toHaveBeenCalled()
    })
  }

  for (const role of ["editor", "owner"] as const) {
    it(`201 when the caller is an ${role} uploading a file`, async () => {
      asMock(getCurrentUser).mockResolvedValue(ALICE)
      asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role })
      asMock(attachments.addAttachment).mockResolvedValue({ id: "a1", filename: "a.txt" })
      const res = await attachmentsRoute.POST(
        uploadReq(new File(["data"], "a.txt", { type: "text/plain" })),
        params("d1")
      )
      expect(res.status).toBe(201)
      expect((await res.json()).attachment).toEqual({ id: "a1", filename: "a.txt" })
      expect(asMock(attachments.addAttachment)).toHaveBeenCalled()
    })
  }

  it("400 when no file is provided", async () => {
    asMock(getCurrentUser).mockResolvedValue(ALICE)
    asMock(docs.getDocumentForUser).mockResolvedValue({ doc: { id: "d1" }, role: "owner" })
    const res = await attachmentsRoute.POST(uploadReq(), params("d1"))
    expect(res.status).toBe(400)
    expect(asMock(attachments.addAttachment)).not.toHaveBeenCalled()
  })
})
