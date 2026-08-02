import type { DocumentComment, User } from "@/lib/types"
import "server-only"
import { getServiceClient } from "./supabaseServer"

// Doc-level comments data layer. Comments are a flat, chronological thread on a
// document. Authorization (who may read/post/delete) is decided by callers via
// getDocumentForUser + getCommentAuthor; these helpers assume that passed.

// All comments for a document, oldest first (chronological), each decorated
// with its author. We fetch a user map in one query like documents.ts does.
export async function listComments(docId: string): Promise<DocumentComment[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_comments")
    .select("*")
    .eq("document_id", docId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  const comments = (data ?? []) as DocumentComment[]

  const userMap = await fetchUserMap(comments.map((c) => c.author_id))
  return comments.map((c) => ({ ...c, author: userMap[c.author_id] }))
}

export async function addComment(docId: string, authorId: string, body: string): Promise<DocumentComment> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_comments")
    .insert({ document_id: docId, author_id: authorId, body })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  const comment = data as DocumentComment

  const userMap = await fetchUserMap([comment.author_id])
  return { ...comment, author: userMap[comment.author_id] }
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from("document_comments").delete().eq("id", commentId)
  if (error) throw new Error(error.message)
}

// Returns the comment's author_id (or null if it doesn't exist), used to
// authorize deletes.
export async function getCommentAuthor(commentId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data } = await supabase.from("document_comments").select("author_id").eq("id", commentId).maybeSingle()
  if (!data) return null
  return (data as { author_id: string }).author_id
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
