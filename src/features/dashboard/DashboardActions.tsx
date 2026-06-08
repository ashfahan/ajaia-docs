"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

export default function DashboardActions() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createDoc() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/documents", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not create document.")
        return
      }
      router.push(`/doc/${data.document.id}`)
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Upload failed.")
        return
      }
      router.push(`/doc/${data.document.id}`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          Upload .txt/.md
        </Button>
        <Button onClick={createDoc} disabled={busy}>
          New document
        </Button>
        <Button variant="ghost" onClick={logout}>
          Sign out
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadFile(f)
        }}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
