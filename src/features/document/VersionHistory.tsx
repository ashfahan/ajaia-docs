"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as React from "react"

interface DocumentVersion {
  id: string
  document_id: string
  title: string
  created_at: string
  created_by: string | null
}

export default function VersionHistory({
  docId,
  canRestore,
  open,
  onOpenChange,
  onRestored,
}: {
  docId: string
  canRestore: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestored: () => void
}) {
  const [versions, setVersions] = React.useState<DocumentVersion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [restoringId, setRestoringId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/documents/${docId}/versions`)
        if (!res.ok) throw new Error("Failed to load version history.")
        const data = (await res.json()) as { versions: DocumentVersion[] }
        if (!cancelled) setVersions(data.versions ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, docId])

  async function handleRestore(versionId: string) {
    setRestoringId(versionId)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      })
      if (!res.ok) throw new Error("Failed to restore this version.")
      onRestored()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>Previous saved versions of this document, newest first.</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No previous versions yet.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <p className="text-muted-foreground text-xs">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canRestore || restoringId === v.id}
                  onClick={() => handleRestore(v.id)}
                >
                  {restoringId === v.id ? "Restoring…" : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
