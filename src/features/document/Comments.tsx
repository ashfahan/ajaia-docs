"use client"

import { Button } from "@/components/ui/button"
import type { DocumentComment, User } from "@/lib/types"
import * as React from "react"

// Comments render as a right-side panel docked to the document (Google-Docs
// style), not a modal, so you can read the doc and the thread together.
export default function Comments({
  docId,
  canComment,
  currentUser,
  open,
  onOpenChange,
}: {
  docId: string
  canComment: boolean
  currentUser: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [comments, setComments] = React.useState<DocumentComment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [body, setBody] = React.useState("")
  const [posting, setPosting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/comments`)
      if (!res.ok) throw new Error("Failed to load comments.")
      const data = (await res.json()) as { comments: DocumentComment[] }
      setComments(data.comments ?? [])
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

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  async function handlePost() {
    const trimmed = body.trim()
    if (!trimmed) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      })
      if (!res.ok) throw new Error("Failed to post comment.")
      setBody("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete comment.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setDeletingId(null)
    }
  }

  if (!open) return null

  return (
    <aside
      data-testid="comments-panel"
      className="bg-background fixed top-0 right-0 z-40 flex h-full w-full max-w-sm flex-col border-l shadow-xl"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Comments</h2>
          <p className="text-muted-foreground text-xs">People with access can discuss this document.</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close comments" onClick={() => onOpenChange(false)}>
          ×
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error && <p className="text-destructive mb-2 text-sm">{error}</p>}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className="bg-muted/40 flex items-start justify-between gap-3 rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{c.author?.display_name ?? "Unknown"}</span>{" "}
                    <span className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleString()}</span>
                  </p>
                  <p className="text-sm break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.author_id === currentUser.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete comment"
                    disabled={deletingId === c.id}
                    onClick={() => handleDelete(c.id)}
                  >
                    ×
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canComment ? (
        <div className="flex flex-col gap-2 border-t px-4 py-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={5000}
            className="border-input focus-visible:ring-ring w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none"
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!body.trim() || posting} onClick={handlePost}>
              {posting ? "Posting…" : "Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          You have view-only access; commenting is off.
        </p>
      )}
    </aside>
  )
}
