# Submission — Ajaia AI-Native Full Stack Developer

**Candidate:** Ashfahan Khan (work@ashfahan.com)
**Project:** Ajaia Docs — a lightweight collaborative document editor

## Links

- **Live app:** https://ajaia-docs-psi.vercel.app
- **Source (GitHub, public):** <https://github.com/ashfahan/ajaia-docs>
- **Source (Google Drive folder):** _<paste Drive folder link>_
- **Walkthrough video (3–5 min):** _<paste unlisted Loom/YouTube link>_

## How to test sharing (seeded, passwordless accounts)

Sign in by picking a user — no password.

| Email              | Use                                            |
| ------------------ | ---------------------------------------------- |
| `alice@ajaia.test` | owner — create & share a doc                   |
| `bob@ajaia.test`   | collaborator — open it under "Shared with you" |
| `carol@ajaia.test` | second reviewer                                |

Flow: sign in as Alice → create a doc, format it, upload a `.txt`/`.md` → **Share** with `bob@ajaia.test` (editor, commenter, or viewer) → open a second browser/incognito, sign in as Bob → the doc appears under **Shared with you** (viewers get a read-only editor; commenters can also use the Comments dialog). You can also create an "anyone with the link" share from the Share dialog and open the resulting `/share/<token>` link.

## What is included (Drive folder)

- `ajaia-docs/` — full source code
- `README.md` — local setup + run instructions
- `ARCHITECTURE.md` — design and scope decisions
- `AI-WORKFLOW.md` — how AI was used, what was changed/rejected, how it was verified
- `SUBMISSION.md` — this file
- `supabase/schema.sql` — DB schema + seed data
- video link (above)

## What works (end to end)

- Document create, rename, rich-text editing (bold, italic, underline, H1–H3, bullet/numbered lists)
- Autosave to Postgres; formatting persists across refresh and reopen
- File upload → new editable document; `.md`/`.markdown` parsed into rich formatting (headings, bold, lists, sanitized), `.txt` as line-per-paragraph
- Version history — documents snapshotted on save, with a History dialog to view timestamps and restore a previous version (owner/editor)
- Live update notifications across clients — when a collaborator saves, others viewing the same doc see an "updated — Load latest" banner (Supabase Realtime)
- Sharing by email with owner/editor/commenter/viewer roles; owned-vs-shared dashboard split; read-only mode for viewers; owner-only delete and share management
- Link sharing — owner can create an "anyone with the link" share (viewer/commenter/editor); logged-in visitors are granted that role and redirected into the doc, anonymous visitors get a read-only view
- Comments — doc-level comment threads with a Comments dialog to read, post, and delete (commenters and above can post)
- File attachments — upload to a private Supabase Storage bucket, list, download via signed URLs, and remove, from a Files dialog
- Passwordless seeded auth; deployed live on Vercel + Supabase (free tier)
- Unit tests over the access-control core, the Markdown export converter, and the Markdown importer; clean typecheck; passing production build

## Deliberate scope cuts (see ARCHITECTURE.md)

- No full real-time co-editing (CRDT/OT multi-cursor) — lightweight live-update notifications _are_ implemented (a "Load latest" banner over Realtime), but collaborators reload the full document rather than merging character-by-character
- No suggestion mode (track changes) — comments _are_ implemented, but inline tracked-changes editing is out of scope
- No org/teams multi-tenancy; no production auth (passwords/OAuth)

## What I'd build next with another 2–4 hours

1. Full real-time co-editing (CRDT/OT multi-cursor) on top of the existing Realtime channel
2. Suggestion mode (track changes) on top of the existing comment threads
3. Org/teams multi-tenancy above per-document sharing
4. RLS at the database layer if moving to Supabase Auth

## Stack

Next.js 16 (App Router) + React 19 + TypeScript · Tiptap 3 · Supabase Postgres · Tailwind CSS 4 · Vitest. Built with Claude Code.
