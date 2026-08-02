import { canComment, canEdit, canManage, canView, effectiveRole, partitionDocuments } from "@/lib/access"
import type { DocumentRow, DocumentShare } from "@/lib/types"
import { describe, expect, it } from "vitest"

// Access control is the security-critical core of the app, so it lives as a
// pure module and is the thing we test. These tests pin down exactly who can
// read, edit, comment, manage, and see each document.

const OWNER = "user-owner"
const EDITOR = "user-editor"
const COMMENTER = "user-commenter"
const VIEWER = "user-viewer"
const STRANGER = "user-stranger"

const doc = (id: string, owner: string): Pick<DocumentRow, "id" | "owner_id"> => ({
  id,
  owner_id: owner,
})

const docA = doc("doc-a", OWNER)

const shares: DocumentShare[] = [
  { document_id: "doc-a", user_id: EDITOR, role: "editor" },
  { document_id: "doc-a", user_id: COMMENTER, role: "commenter" },
  { document_id: "doc-a", user_id: VIEWER, role: "viewer" },
]

describe("effectiveRole", () => {
  it("returns owner for the document owner (even over a stray share row)", () => {
    const withOwnerShare: DocumentShare[] = [...shares, { document_id: "doc-a", user_id: OWNER, role: "viewer" }]
    expect(effectiveRole(docA, withOwnerShare, OWNER)).toBe("owner")
  })

  it("returns the shared role for shared users", () => {
    expect(effectiveRole(docA, shares, EDITOR)).toBe("editor")
    expect(effectiveRole(docA, shares, COMMENTER)).toBe("commenter")
    expect(effectiveRole(docA, shares, VIEWER)).toBe("viewer")
  })

  it("returns null for users with no access", () => {
    expect(effectiveRole(docA, shares, STRANGER)).toBeNull()
  })

  it("returns null when there is no current user", () => {
    expect(effectiveRole(docA, shares, null)).toBeNull()
    expect(effectiveRole(docA, shares, undefined)).toBeNull()
  })

  it("does not leak a share from a different document", () => {
    const otherDocShare: DocumentShare[] = [{ document_id: "doc-other", user_id: STRANGER, role: "editor" }]
    expect(effectiveRole(docA, otherDocShare, STRANGER)).toBeNull()
  })
})

describe("canView / canEdit / canComment / canManage", () => {
  it("owner can view, edit, comment and manage", () => {
    expect(canView(docA, shares, OWNER)).toBe(true)
    expect(canEdit(docA, shares, OWNER)).toBe(true)
    expect(canComment(docA, shares, OWNER)).toBe(true)
    expect(canManage(docA, OWNER)).toBe(true)
  })

  it("editor can view, edit and comment but not manage", () => {
    expect(canView(docA, shares, EDITOR)).toBe(true)
    expect(canEdit(docA, shares, EDITOR)).toBe(true)
    expect(canComment(docA, shares, EDITOR)).toBe(true)
    expect(canManage(docA, EDITOR)).toBe(false)
  })

  it("commenter can view and comment but not edit or manage", () => {
    expect(canView(docA, shares, COMMENTER)).toBe(true)
    expect(canComment(docA, shares, COMMENTER)).toBe(true)
    expect(canEdit(docA, shares, COMMENTER)).toBe(false)
    expect(canManage(docA, COMMENTER)).toBe(false)
  })

  it("viewer can view but not comment, edit or manage", () => {
    expect(canView(docA, shares, VIEWER)).toBe(true)
    expect(canComment(docA, shares, VIEWER)).toBe(false)
    expect(canEdit(docA, shares, VIEWER)).toBe(false)
    expect(canManage(docA, VIEWER)).toBe(false)
  })

  it("stranger can do nothing", () => {
    expect(canView(docA, shares, STRANGER)).toBe(false)
    expect(canComment(docA, shares, STRANGER)).toBe(false)
    expect(canEdit(docA, shares, STRANGER)).toBe(false)
    expect(canManage(docA, STRANGER)).toBe(false)
  })
})

describe("partitionDocuments", () => {
  const docs: Array<Pick<DocumentRow, "id" | "owner_id">> = [
    doc("doc-a", OWNER), // owned by OWNER
    doc("doc-b", EDITOR), // owned by EDITOR, shared to OWNER below
    doc("doc-c", STRANGER), // not shared to OWNER -> should not appear
  ]
  const allShares: DocumentShare[] = [{ document_id: "doc-b", user_id: OWNER, role: "editor" }]

  it("splits owned vs shared and tags the shared role", () => {
    const { owned, shared } = partitionDocuments(docs, allShares, OWNER)
    expect(owned.map((d) => d.id)).toEqual(["doc-a"])
    expect(shared.map((d) => d.id)).toEqual(["doc-b"])
    expect(shared[0].shared_role).toBe("editor")
  })

  it("never lists an owned doc as shared", () => {
    const sharesOnOwned: DocumentShare[] = [{ document_id: "doc-a", user_id: OWNER, role: "viewer" }]
    const { owned, shared } = partitionDocuments([doc("doc-a", OWNER)], sharesOnOwned, OWNER)
    expect(owned).toHaveLength(1)
    expect(shared).toHaveLength(0)
  })
})
