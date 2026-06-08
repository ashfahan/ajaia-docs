import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { restoreVersion } from "@/services/versions"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

// POST: restore a document to a previous version. Owner or editor only.
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  const { id } = await params

  const result = await getDocumentForUser(id, user.id)
  if (!result) return NextResponse.json({ error: "Not found or no access." }, { status: 404 })
  if (result.role !== "owner" && result.role !== "editor") {
    return NextResponse.json({ error: "Only the owner or an editor can restore versions." }, { status: 403 })
  }

  let body: { versionId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const versionId = body.versionId
  if (typeof versionId !== "string" || versionId.trim() === "") {
    return NextResponse.json({ error: "versionId is required." }, { status: 400 })
  }

  await restoreVersion(id, versionId, user.id)
  return NextResponse.json({ ok: true })
}
