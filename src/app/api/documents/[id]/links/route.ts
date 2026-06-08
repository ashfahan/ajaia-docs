import type { ShareRole } from "@/lib/types"
import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { createLink, listLinks } from "@/services/links"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

const ROLES: ShareRole[] = ["viewer", "commenter", "editor"]

// GET: list the document's share links. Owner only (it's a management view).
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can manage links." }, { status: 403 })
  }

  const links = await listLinks(id)
  return NextResponse.json({ links })
}

// POST: create a new share link at the given role. Owner only.
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can create links." }, { status: 403 })
  }

  let body: { role?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const role = (body.role ?? "viewer") as ShareRole
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 })
  }

  const link = await createLink(id, role, user.id)
  return NextResponse.json({ link }, { status: 201 })
}
