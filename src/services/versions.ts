import type { DocumentRow } from "@/lib/types"
import "server-only"
import { getServiceClient } from "./supabaseServer"

// Version-history data layer. Versions are point-in-time snapshots of a
// document's title + content. The server (service-role) writes them on a
// throttled schedule from autosave and on every restore so history stays
// useful without exploding into thousands of near-identical rows.

export interface DocumentVersion {
  id: string
  document_id: string
  title: string
  content_json: unknown | null
  content_html: string | null
  created_at: string
  created_by: string | null
}

const DEFAULT_MIN_INTERVAL_MS = 20_000

// Insert a snapshot of the CURRENT documents row. Best-effort: this sits on
// the autosave critical path, so it never throws to the caller — failures are
// swallowed (and logged). Throttled: if the newest existing version is more
// recent than minIntervalMs, do nothing so autosave doesn't spam versions.
export async function snapshotVersion(
  docId: string,
  userId: string | null,
  opts?: { minIntervalMs?: number }
): Promise<void> {
  const minIntervalMs = opts?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
  try {
    const supabase = getServiceClient()

    const { data: doc } = await supabase
      .from("documents")
      .select("title, content_json, content_html")
      .eq("id", docId)
      .single()
    if (!doc) return

    const { data: latest } = await supabase
      .from("document_versions")
      .select("created_at")
      .eq("document_id", docId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest?.created_at) {
      const age = Date.now() - new Date(latest.created_at).getTime()
      if (age < minIntervalMs) return // too soon — throttle.
    }

    const current = doc as Pick<DocumentRow, "title" | "content_json" | "content_html">
    const { error } = await supabase.from("document_versions").insert({
      document_id: docId,
      title: current.title,
      content_json: current.content_json,
      content_html: current.content_html,
      created_by: userId,
    })
    if (error) throw new Error(error.message)
  } catch (e) {
    // Never disrupt the caller's critical path (e.g. autosave/save).
    console.error("snapshotVersion failed:", e)
  }
}

// All versions for a document, newest first.
export async function listVersions(docId: string): Promise<DocumentVersion[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", docId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentVersion[]
}

// Restore a document to a previous version. We first snapshot the CURRENT
// state (so the restore itself is reversible from history), then overwrite the
// documents row with the chosen version's title/content.
export async function restoreVersion(docId: string, versionId: string, userId: string | null): Promise<void> {
  const supabase = getServiceClient()

  // Make the restore reversible by capturing the current state first.
  await snapshotVersion(docId, userId, { minIntervalMs: 0 })

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .select("title, content_json, content_html")
    .eq("id", versionId)
    .eq("document_id", docId)
    .single()
  if (versionError) throw new Error(versionError.message)
  if (!version) throw new Error("Version not found.")

  const v = version as Pick<DocumentVersion, "title" | "content_json" | "content_html">
  const { error } = await supabase
    .from("documents")
    .update({
      title: v.title,
      content_json: v.content_json,
      content_html: v.content_html,
      updated_at: new Date().toISOString(),
    })
    .eq("id", docId)
  if (error) throw new Error(error.message)
}
