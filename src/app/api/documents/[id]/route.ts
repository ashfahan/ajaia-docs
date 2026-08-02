import { getCurrentUser } from "@/services/auth"
import { deleteDocument, getDocumentForUser, updateDocument } from "@/services/documents"
import { snapshotVersion } from "@/services/versions"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

// GET: read a document (any role with access). Returns the caller's role too.
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  return NextResponse.json({ document: result.doc, role: result.role })
}

// PATCH: save content and/or rename. Owners and editors only.
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role === "viewer") {
    return NextResponse.json({ error: "You have view-only access." }, { status: 403 })
  }

  let body: { title?: string; content_json?: unknown; content_html?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const patch: {
    title?: string
    content_json?: unknown
    content_html?: string
  } = {}
  if (typeof body.title === "string") {
    const t = body.title.trim()
    if (!t) return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 })
    if (t.length > 200) return NextResponse.json({ error: "Title too long." }, { status: 400 })
    patch.title = t
  }
  if (body.content_json !== undefined) patch.content_json = body.content_json
  if (typeof body.content_html === "string") patch.content_html = body.content_html

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  // Snapshot the prior state as a restorable version (throttled internally
  // so autosave doesn't spam history); best-effort, never blocks the save.
  await snapshotVersion(id, user.id)

  const doc = await updateDocument(id, patch)
  return NextResponse.json({ document: doc })
}

// DELETE: owner only.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete." }, { status: 403 })
  }

  await deleteDocument(id)
  return NextResponse.json({ ok: true })
}
