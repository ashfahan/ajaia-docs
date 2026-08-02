import type { DocumentLink, DocumentRow, ShareRole } from "@/lib/types"
import "server-only"
import { getServiceClient } from "./supabaseServer"

// Data-access layer for "anyone with the link" sharing. A document_links row
// is a capability token: following it grants access at the row's role. These
// helpers own the Supabase queries; callers enforce authorization (owner-only
// for create/list/delete) before invoking the mutating ones.

export async function createLink(docId: string, role: ShareRole, userId: string): Promise<DocumentLink> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_links")
    .insert({ document_id: docId, role, created_by: userId })
    .select("token, document_id, role, created_at")
    .single()
  if (error) throw new Error(error.message)
  return data as DocumentLink
}

export async function listLinks(docId: string): Promise<DocumentLink[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_links")
    .select("token, document_id, role, created_at")
    .eq("document_id", docId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentLink[]
}

export async function deleteLink(token: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from("document_links").delete().eq("token", token)
  if (error) throw new Error(error.message)
}

export async function resolveLink(token: string): Promise<{ document: DocumentRow; role: ShareRole } | null> {
  const supabase = getServiceClient()
  const { data: link } = await supabase
    .from("document_links")
    .select("token, document_id, role, created_at")
    .eq("token", token)
    .single()
  if (!link) return null

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", (link as DocumentLink).document_id)
    .single()
  if (!doc) return null

  return { document: doc as DocumentRow, role: (link as DocumentLink).role }
}

// Persist access for a logged-in visitor following a link, so they keep access
// at that role on subsequent visits. Upsert keeps the highest intent simple:
// the link role overwrites any existing share for this user on this document.
export async function grantLinkRoleToUser(docId: string, userId: string, role: ShareRole): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from("document_shares")
    .upsert({ document_id: docId, user_id: userId, role }, { onConflict: "document_id,user_id" })
  if (error) throw new Error(error.message)
}
