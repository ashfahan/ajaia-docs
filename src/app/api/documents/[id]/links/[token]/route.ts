import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { deleteLink } from "@/services/links"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string; token: string }> }

// DELETE: revoke a share link. Owner only.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id, token } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can manage links." }, { status: 403 })
  }

  await deleteLink(token)
  return NextResponse.json({ ok: true })
}
