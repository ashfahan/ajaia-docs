import { deleteAttachment, getAttachmentDownloadUrl, getAttachmentUploader } from "@/services/attachments"
import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string; attachmentId: string }> }

// GET: download an attachment via a short-lived signed URL. Any role with
// access may download.
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id, attachmentId } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const download = await getAttachmentDownloadUrl(attachmentId)
  if (!download) return NextResponse.json({ error: "Attachment not found." }, { status: 404 })

  return NextResponse.redirect(download.url)
}

// DELETE: remove an attachment. Allowed for the uploader or the document owner.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id, attachmentId } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const uploader = await getAttachmentUploader(attachmentId)
  if (uploader !== user.id && result.role !== "owner") {
    return NextResponse.json({ error: "Only the uploader or the owner can remove this attachment." }, { status: 403 })
  }

  await deleteAttachment(attachmentId)
  return NextResponse.json({ ok: true })
}
