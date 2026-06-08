"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DocumentShare, ShareRole, User } from "@/lib/types"
import { useEffect, useState } from "react"
import LinkShareSection from "./LinkShareSection"

type ShareWithUser = DocumentShare & { user: User }

export default function ShareDialog({
  docId,
  currentUser,
  open,
  onOpenChange,
}: {
  docId: string
  currentUser: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [shares, setShares] = useState<ShareWithUser[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ShareRole>("editor")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch(`/api/documents/${docId}/share`)
    if (res.ok) {
      const data = await res.json()
      setShares(data.shares ?? [])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function grant(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${docId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not share.")
        return
      }
      setEmail("")
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(userId: string) {
    await fetch(`/api/documents/${docId}/share?userId=${userId}`, {
      method: "DELETE",
    })
    await load()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Share by email, or create a link. Editors can change the document, commenters can comment, viewers can only
            read.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={grant} className="flex gap-2">
          <Input
            data-testid="share-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bob@ajaia.test"
            className="flex-1"
          />
          <Select value={role} onValueChange={(v) => setRole(v as ShareRole)}>
            <SelectTrigger data-testid="share-role" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="commenter">Commenter</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" data-testid="share-submit" disabled={busy || !email.trim()}>
            Share
          </Button>
        </form>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">People with access</p>
          <ul className="space-y-1.5">
            <li className="bg-muted flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span>
                {currentUser.display_name} <span className="text-muted-foreground">({currentUser.email})</span>
              </span>
              <span className="text-muted-foreground text-xs font-medium">Owner</span>
            </li>
            {shares.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span>
                  {s.user.display_name} <span className="text-muted-foreground">({s.user.email})</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium">{s.role}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revoke(s.user_id)}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
            {shares.length === 0 && (
              <li className="text-muted-foreground px-3 py-2 text-xs">Not shared with anyone yet.</li>
            )}
          </ul>
        </div>

        <div className="border-t pt-4">
          <LinkShareSection docId={docId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
