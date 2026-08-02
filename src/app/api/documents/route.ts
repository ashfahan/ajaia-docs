import { getCurrentUser } from "@/services/auth"
import { createDocument, listDocumentsForUser } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

// GET: documents the current user owns + documents shared with them.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })

  const { owned, shared } = await listDocumentsForUser(user.id)
  return NextResponse.json({ owned, shared })
}

// POST: create a new (empty) document owned by the current user.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })

  let title = "Untitled document"
  try {
    const body = await req.json()
    if (body?.title && typeof body.title === "string") title = body.title.trim() || title
  } catch {
    // empty body is fine
  }

  const doc = await createDocument(user.id, title)
  return NextResponse.json({ document: doc }, { status: 201 })
}
