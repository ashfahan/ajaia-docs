"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { DocumentAttachment } from "@/lib/types"
import * as React from "react"

function formatSize(bytes: number | null): string {
  if (bytes == null) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Attachments({
  docId,
  canEdit,
  open,
  onOpenChange,
}: {
  docId: string
  canEdit: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [attachments, setAttachments] = React.useState<DocumentAttachment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/attachments`)
      if (!res.ok) throw new Error("Failed to load attachments.")
      const data = (await res.json()) as { attachments: DocumentAttachment[] }
      setAttachments(data.attachments ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }, [docId])

  React.useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch(`/api/documents/${docId}/attachments`, { method: "POST", body })
      if (!res.ok) throw new Error("Failed to upload attachment.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleRemove(attachmentId: string) {
    setRemovingId(attachmentId)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/attachments/${attachmentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove attachment.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>Files attached to this document.</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {canEdit && (
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No attachments yet.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.filename}</p>
                  <p className="text-muted-foreground text-xs">{formatSize(a.size)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/api/documents/${docId}/attachments/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Download
                  </a>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingId === a.id}
                      onClick={() => handleRemove(a.id)}
                    >
                      {removingId === a.id ? "Removing…" : "Remove"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
