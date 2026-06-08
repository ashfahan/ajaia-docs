"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DocumentLink, ShareRole } from "@/lib/types"
import { useEffect, useState } from "react"

// Renders inside the existing Share dialog (no Dialog wrapper of its own).
// Lists "anyone with the link" links and lets the owner mint or revoke them.
export default function LinkShareSection({ docId }: { docId: string }) {
  const [links, setLinks] = useState<DocumentLink[]>([])
  const [role, setRole] = useState<ShareRole>("viewer")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/documents/${docId}/links`)
    if (res.ok) {
      const data = await res.json()
      setLinks(data.links ?? [])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function create() {
    setBusy(true)
    try {
      const res = await fetch(`/api/documents/${docId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) await load()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(token: string) {
    await fetch(`/api/documents/${docId}/links/${token}`, { method: "DELETE" })
    await load()
  }

  function urlFor(token: string) {
    return `${window.location.origin}/share/${token}`
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token))
    setCopied(token)
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500)
  }

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Share via link</p>

      <div className="mb-3 flex gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as ShareRole)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="commenter">Commenter</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" onClick={create} disabled={busy}>
          Create link
        </Button>
      </div>

      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.token} className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">{urlFor(l.token)}</span>
            <span className="text-muted-foreground text-xs font-medium">{l.role}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(l.token)}>
              {copied === l.token ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => revoke(l.token)}
            >
              Revoke
            </Button>
          </li>
        ))}
        {links.length === 0 && <li className="text-muted-foreground px-3 py-2 text-xs">No links yet.</li>}
      </ul>
    </div>
  )
}
