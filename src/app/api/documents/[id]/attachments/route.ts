import { addAttachment, listAttachments } from "@/services/attachments"
import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// GET: list a document's attachments. Any role with access may view.
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const attachments = await listAttachments(id)
  return NextResponse.json({ attachments })
}

// POST: upload a new attachment. Owner or editor only.
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner" && result.role !== "editor") {
    return NextResponse.json({ error: "Only the owner or an editor can upload attachments." }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds the 5 MB limit." }, { status: 400 })
  }

  const attachment = await addAttachment(id, user.id, {
    filename: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    bytes: await file.arrayBuffer(),
  })
  return NextResponse.json({ attachment }, { status: 201 })
}
