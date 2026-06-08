import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { listVersions } from "@/services/versions"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

// GET: list a document's version history. Any role with access (owner,
// editor, viewer) may view history.
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })

  const versions = await listVersions(id)
  return NextResponse.json({ versions })
}
