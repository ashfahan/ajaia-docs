import { getCurrentUser } from "@/services/auth"
import { deleteComment, getCommentAuthor } from "@/services/comments"
import { getDocumentForUser } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string; commentId: string }> }

// DELETE: remove a comment. Allowed if the caller authored the comment, or if
// the caller is the document owner (moderation).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id, commentId } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const authorId = await getCommentAuthor(commentId)
  if (authorId !== user.id && result.role !== "owner") {
    return NextResponse.json({ error: "You can't delete this comment." }, { status: 403 })
  }

  await deleteComment(commentId)
  return NextResponse.json({ ok: true })
}
