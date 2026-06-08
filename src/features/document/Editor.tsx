"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { tiptapJsonToMarkdown } from "@/lib/markdown"
import type { DocumentRow, EffectiveRole, User } from "@/lib/types"
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import Attachments from "./Attachments"
import Comments from "./Comments"
import ShareDialog from "./ShareDialog"
import VersionHistory from "./VersionHistory"
import { useDocRealtime } from "./useDocRealtime"

type SaveState = "idle" | "saving" | "saved" | "error"

export default function Editor({
  doc,
  role,
  currentUser,
}: {
  doc: DocumentRow
  role: EffectiveRole
  currentUser: User
}) {
  const router = useRouter()
  const canEdit = role === "owner" || role === "editor"
  const canComment = role === "owner" || role === "editor" || role === "commenter"
  const isOwner = role === "owner"

  const [title, setTitle] = useState(doc.title)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [shareOpen, setShareOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [remoteUpdated, setRemoteUpdated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live updates: broadcast a ping after we save; flag a banner when another
  // collaborator edits (we refetch through the authenticated API on demand).
  const { broadcastUpdate } = useDocRealtime({
    docId: doc.id,
    selfId: currentUser.id,
    onRemoteUpdate: () => setRemoteUpdated(true),
  })

  const save = useCallback(
    async (patch: { title?: string; content_html?: string; content_json?: unknown }) => {
      if (!canEdit) return
      setSaveState("saving")
      setError(null)
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setSaveState("error")
          setError(data.error ?? "Save failed.")
          return
        }
        setSaveState("saved")
        broadcastUpdate()
      } catch {
        setSaveState("error")
        setError("Network error while saving.")
      }
    },
    [canEdit, doc.id, broadcastUpdate]
  )

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    // StarterKit v3 already bundles the underline extension.
    extensions: [StarterKit],
    content: doc.content_html || "<p></p>",
    editorProps: {
      attributes: {
        class: "doc-content min-h-[60vh]",
        "data-placeholder": "Start writing...",
      },
    },
    onUpdate: ({ editor }) => {
      if (!canEdit) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaveState("saving")
      saveTimer.current = setTimeout(() => {
        save({
          content_html: editor.getHTML(),
          content_json: editor.getJSON(),
        })
      }, 800)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  // Reload the latest persisted content into the editor (used by the
  // "updated by collaborator" banner and after restoring a version).
  const refreshContent = useCallback(async () => {
    const res = await fetch(`/api/documents/${doc.id}`)
    if (!res.ok) return
    const data = await res.json()
    setTitle(data.document.title)
    editor?.commands.setContent(data.document.content_html || "<p></p>")
    setRemoteUpdated(false)
  }, [doc.id, editor])

  function commitTitle() {
    const t = title.trim()
    if (!t || t === doc.title) {
      setTitle(doc.title)
      return
    }
    save({ title: t })
  }

  function exportMarkdown() {
    if (!editor) return
    const md = tiptapJsonToMarkdown(editor.getJSON())
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(title || "document").replace(/[^\w.-]+/g, "_")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    window.open(`/doc/${doc.id}/print`, "_blank", "noopener")
  }

  async function handleDelete() {
    if (!confirm("Delete this document? This cannot be undone.")) return
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard")
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Delete failed.")
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">
            &larr; Docs
          </Link>
          <input
            data-testid="doc-title"
            value={title}
            disabled={!canEdit}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
            className="flex-1 rounded px-2 py-1 text-base font-semibold text-zinc-900 outline-none focus:bg-zinc-100 disabled:bg-transparent"
          />
          <SaveBadge state={saveState} canEdit={canEdit} role={role} />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportMarkdown}>Download Markdown</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>Download PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => setCommentsOpen(true)}>
            Comments
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAttachmentsOpen(true)}>
            Files
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
          {isOwner && (
            <>
              <Button size="sm" onClick={() => setShareOpen(true)}>
                Share
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </div>

        {canEdit && editor && <Toolbar editor={editor} />}
      </div>

      {error && (
        <div className="mx-auto max-w-3xl px-6 pt-3">
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        </div>
      )}

      {remoteUpdated && (
        <div className="mx-auto max-w-3xl px-6 pt-3">
          <div className="flex items-center justify-between gap-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span>This document was updated by a collaborator.</span>
            <Button size="sm" variant="outline" onClick={refreshContent}>
              Load latest
            </Button>
          </div>
        </div>
      )}

      {/* Paper */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-10 shadow-sm">
          <EditorContent editor={editor} />
        </div>
        <p className="mt-3 text-center text-xs text-zinc-400">
          {canEdit
            ? "Changes save automatically."
            : role === "commenter"
              ? "You can comment but not edit this document."
              : "You have view-only access to this document."}
        </p>
      </div>

      <ShareDialog docId={doc.id} currentUser={currentUser} open={shareOpen} onOpenChange={setShareOpen} />

      <VersionHistory
        docId={doc.id}
        canRestore={canEdit}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={refreshContent}
      />

      <Comments
        docId={doc.id}
        canComment={canComment}
        currentUser={currentUser}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />

      <Attachments docId={doc.id} canEdit={canEdit} open={attachmentsOpen} onOpenChange={setAttachmentsOpen} />
    </div>
  )
}

function SaveBadge({ state, canEdit, role }: { state: SaveState; canEdit: boolean; role: EffectiveRole }) {
  if (!canEdit) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        {role === "viewer" ? "View only" : role}
      </span>
    )
  }
  const map: Record<SaveState, string> = {
    idle: "",
    saving: "Saving...",
    saved: "Saved",
    error: "Save failed",
  }
  if (!map[state]) return null
  return <span className={`text-xs ${state === "error" ? "text-red-500" : "text-zinc-400"}`}>{map[state]}</span>
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const Btn = ({
    onClick,
    active,
    label,
    title,
  }: {
    onClick: () => void
    active?: boolean
    label: string
    title: string
  }) => (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" title={title} onClick={onClick}>
      {label}
    </Button>
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-6 pb-2">
      <Btn
        title="Bold"
        label="B"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Btn
        title="Italic"
        label="I"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Btn
        title="Underline"
        label="U"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <span className="bg-border mx-1 h-5 w-px" />
      <Btn
        title="Heading 1"
        label="H1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <Btn
        title="Heading 2"
        label="H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Btn
        title="Heading 3"
        label="H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className="bg-border mx-1 h-5 w-px" />
      <Btn
        title="Bullet list"
        label="• List"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Btn
        title="Numbered list"
        label="1. List"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  )
}
