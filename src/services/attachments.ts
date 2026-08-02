import type { DocumentAttachment } from "@/lib/types"
import "server-only"
import { getServiceClient } from "./supabaseServer"

// File-attachments data layer. Files live in the private Storage bucket
// "attachments"; this table holds their metadata. The service-role client
// bypasses Storage RLS, and all access control is enforced in route handlers.

const BUCKET = "attachments"

// All attachments for a document, newest first.
export async function listAttachments(docId: string): Promise<DocumentAttachment[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_attachments")
    .select("*")
    .eq("document_id", docId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentAttachment[]
}

// Upload a file's bytes to Storage then insert its metadata row. The storage
// path is namespaced by document and de-duplicated with a random UUID so two
// uploads with the same name never collide.
export async function addAttachment(
  docId: string,
  userId: string,
  file: { filename: string; mime: string; size: number; bytes: ArrayBuffer }
): Promise<DocumentAttachment> {
  const supabase = getServiceClient()

  const safeName = file.filename.replace(/[^\w.-]/g, "_")
  const storagePath = `${docId}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.bytes, { contentType: file.mime })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from("document_attachments")
    .insert({
      document_id: docId,
      uploaded_by: userId,
      filename: file.filename,
      mime: file.mime,
      size: file.size,
      storage_path: storagePath,
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return data as DocumentAttachment
}

// Create a short-lived signed download URL for an attachment.
export async function getAttachmentDownloadUrl(
  attachmentId: string
): Promise<{ url: string; filename: string } | null> {
  const supabase = getServiceClient()

  const { data: row, error } = await supabase
    .from("document_attachments")
    .select("filename, storage_path")
    .eq("id", attachmentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return null

  const attachment = row as Pick<DocumentAttachment, "filename" | "storage_path">
  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storage_path, 60)
  if (signedError) throw new Error(signedError.message)
  if (!signed) return null

  return { url: signed.signedUrl, filename: attachment.filename }
}

// Delete an attachment: remove the stored object first, then its metadata row.
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const supabase = getServiceClient()

  const { data: row, error } = await supabase
    .from("document_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return

  const attachment = row as Pick<DocumentAttachment, "storage_path">
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([attachment.storage_path])
  if (removeError) throw new Error(removeError.message)

  const { error: deleteError } = await supabase.from("document_attachments").delete().eq("id", attachmentId)
  if (deleteError) throw new Error(deleteError.message)
}

// The id of the user who uploaded an attachment, for delete authorization.
export async function getAttachmentUploader(attachmentId: string): Promise<string | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("document_attachments")
    .select("uploaded_by")
    .eq("id", attachmentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return (data as Pick<DocumentAttachment, "uploaded_by">).uploaded_by
}
