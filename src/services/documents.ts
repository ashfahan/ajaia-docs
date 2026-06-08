import { effectiveRole, partitionDocuments } from "@/lib/access"
import type { DocumentListItem, DocumentRow, DocumentShare, EffectiveRole, ShareRole, User } from "@/lib/types"
import "server-only"
import { getServiceClient } from "./supabaseServer"

// Data-access layer. Route handlers and server components call these; the
// functions own the Supabase queries and reuse the pure logic in access.ts
// for any "who can see what" decision. Access checks (canEdit/canManage) are
// done by callers before mutating — these helpers assume authorization passed,
// except listDocumentsForUser/getDocumentForUser which scope by user.

export async function listDocumentsForUser(
  userId: string
): Promise<{ owned: DocumentListItem[]; shared: DocumentListItem[] }> {
  const supabase = getServiceClient()

  const { data: shareRows } = await supabase
    .from("document_shares")
    .select("document_id, user_id, role")
    .eq("user_id", userId)
  const shares = (shareRows ?? []) as DocumentShare[]
  const sharedIds = shares.map((s) => s.document_id)

  // Owned docs + docs shared with this user, in one fetch where possible.
  const orFilter = sharedIds.length ? `owner_id.eq.${userId},id.in.(${sharedIds.join(",")})` : `owner_id.eq.${userId}`

  const { data: docRows } = await supabase
    .from("documents")
    .select("*")
    .or(orFilter)
    .order("updated_at", { ascending: false })
  const docs = (docRows ?? []) as DocumentRow[]

  // Attach owner display info.
  const ownerIds = Array.from(new Set(docs.map((d) => d.owner_id)))
  const ownerMap = await fetchUserMap(ownerIds)

  const { owned, shared } = partitionDocuments(docs, shares, userId)

  const decorate = (d: DocumentRow, role?: ShareRole): DocumentListItem => ({
    ...d,
    owner_email: ownerMap[d.owner_id]?.email ?? "unknown",
    owner_name: ownerMap[d.owner_id]?.display_name ?? "Unknown",
    ...(role ? { shared_role: role } : {}),
  })

  return {
    owned: owned.map((d) => decorate(d)),
    shared: shared.map((d) => decorate(d, d.shared_role)),
  }
}

export async function getDocumentForUser(
  docId: string,
  userId: string
): Promise<{ doc: DocumentRow; role: EffectiveRole } | null> {
  const supabase = getServiceClient()

  const { data: doc } = await supabase.from("documents").select("*").eq("id", docId).single()
  if (!doc) return null

  const { data: shareRows } = await supabase
    .from("document_shares")
    .select("document_id, user_id, role")
    .eq("document_id", docId)
  const shares = (shareRows ?? []) as DocumentShare[]

  const role = effectiveRole(doc as DocumentRow, shares, userId)
  if (!role) return null // no access

  return { doc: doc as DocumentRow, role }
}

export async function getDocumentShares(docId: string): Promise<Array<DocumentShare & { user: User }>> {
  const supabase = getServiceClient()
  const { data: shareRows } = await supabase
    .from("document_shares")
    .select("document_id, user_id, role")
    .eq("document_id", docId)
  const shares = (shareRows ?? []) as DocumentShare[]
  const userMap = await fetchUserMap(shares.map((s) => s.user_id))
  return shares.filter((s) => userMap[s.user_id]).map((s) => ({ ...s, user: userMap[s.user_id] }))
}

export async function createDocument(userId: string, title = "Untitled document"): Promise<DocumentRow> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from("documents").insert({ owner_id: userId, title }).select("*").single()
  if (error) throw new Error(error.message)
  return data as DocumentRow
}

export async function createDocumentFromText(userId: string, title: string, text: string): Promise<DocumentRow> {
  return createDocumentFromHtml(userId, title, textToHtml(text))
}

export async function createDocumentFromHtml(userId: string, title: string, html: string): Promise<DocumentRow> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: userId, title, content_html: html })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data as DocumentRow
}

export async function updateDocument(
  docId: string,
  patch: { title?: string; content_json?: unknown; content_html?: string }
): Promise<DocumentRow> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", docId)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data as DocumentRow
}

export async function deleteDocument(docId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from("documents").delete().eq("id", docId)
  if (error) throw new Error(error.message)
}

export async function shareDocumentByEmail(docId: string, email: string, role: ShareRole): Promise<{ user: User }> {
  const supabase = getServiceClient()
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("email", email.toLowerCase().trim())
    .single()
  if (!user) throw new NotFoundError("No user with that email is registered.")

  const { error } = await supabase
    .from("document_shares")
    .upsert({ document_id: docId, user_id: (user as User).id, role }, { onConflict: "document_id,user_id" })
  if (error) throw new Error(error.message)
  return { user: user as User }
}

export async function revokeShare(docId: string, userId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from("document_shares").delete().eq("document_id", docId).eq("user_id", userId)
  if (error) throw new Error(error.message)
}

// --- helpers ---

async function fetchUserMap(ids: string[]): Promise<Record<string, User>> {
  if (ids.length === 0) return {}
  const supabase = getServiceClient()
  const { data } = await supabase
    .from("users")
    .select("id, email, display_name")
    .in("id", Array.from(new Set(ids)))
  const map: Record<string, User> = {}
  for (const u of (data ?? []) as User[]) map[u.id] = u
  return map
}

// Imported .txt/.md files are brought in as plain text: each non-empty line
// becomes a paragraph. Markdown syntax is NOT parsed (documented scope cut).
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const paras = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .map((line) => (line.length ? `<p>${escape(line)}</p>` : ""))
    .filter(Boolean)
  return paras.length ? paras.join("") : "<p></p>"
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotFoundError"
  }
}
