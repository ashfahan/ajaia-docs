import type { ShareRole } from "@/lib/types"
import { getCurrentUser } from "@/services/auth"
import {
  getDocumentForUser,
  getDocumentShares,
  NotFoundError,
  revokeShare,
  shareDocumentByEmail,
} from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

// GET: list who the document is shared with. Owner only (it's a management view).
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can manage sharing." }, { status: 403 })
  }

  const shares = await getDocumentShares(id)
  return NextResponse.json({ shares })
}

// POST: grant access to a user by email. Owner only.
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can share." }, { status: 403 })
  }

  let body: { email?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  const email = body.email?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 })

  const role: ShareRole =
    body.role === "viewer" || body.role === "commenter" || body.role === "editor" ? body.role : "editor"

  if (email === user.email) {
    return NextResponse.json({ error: "You already own this document." }, { status: 400 })
  }

  try {
    const { user: target } = await shareDocumentByEmail(id, email, role)
    return NextResponse.json({ ok: true, sharedWith: target, role })
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    throw e
  }
}

// DELETE: revoke a user's access. Owner only. Pass ?userId=...
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can manage sharing." }, { status: 403 })
  }

  const targetId = req.nextUrl.searchParams.get("userId")
  if (!targetId) return NextResponse.json({ error: "userId is required." }, { status: 400 })

  await revokeShare(id, targetId)
  return NextResponse.json({ ok: true })
}
