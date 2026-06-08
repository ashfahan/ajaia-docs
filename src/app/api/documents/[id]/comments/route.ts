import { getCurrentUser } from "@/services/auth"
import { addComment, listComments } from "@/services/comments"
import { getDocumentForUser } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

const MAX_BODY_LENGTH = 5000

// GET: list a document's comments. Any role with access (owner, editor,
// commenter, viewer) may read comments.
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const comments = await listComments(id)
  return NextResponse.json({ comments })
}

// POST: add a comment. Owner, editor, or commenter only (viewers can't).
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner" && result.role !== "editor" && result.role !== "commenter") {
    return NextResponse.json({ error: "You don't have permission to comment." }, { status: 403 })
  }

  let payload: { body?: unknown }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const raw = payload.body
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 })
  }
  const body = raw.trim()
  if (body === "" || body.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Comment must be between 1 and 5000 characters." }, { status: 400 })
  }

  const comment = await addComment(id, user.id, body)
  return NextResponse.json({ comment }, { status: 201 })
}
