# Submission - Ajaia AI-Native Full Stack Developer

**Candidate:** Ashfahan Khan (work@ashfahan.com)
**Project:** Ajaia Docs - a lightweight collaborative document editor

## Links

- **Live app:** <https://ajaia-docs-psi.vercel.app>
- **Source (GitHub, public):** <https://github.com/ashfahan/ajaia-docs>
- **Submission folder (Google Drive - source, docs, video):** <https://drive.google.com/drive/folders/1EXcbWzbjVegdhpeT5qu0DL8GhfukmW74>
- **Walkthrough video (4:51):** <https://drive.google.com/file/d/1xZNcK_YuHYiSp9h2Iq1FtRZJ9oPKlPRK/view>

## How to test sharing (seeded, passwordless accounts)

Sign in by picking a user - no password.

| Email              | Use                                            |
| ------------------ | ---------------------------------------------- |
| `alice@ajaia.test` | owner - create & share a doc                   |
| `bob@ajaia.test`   | collaborator - open it under "Shared with you" |
| `carol@ajaia.test` | second reviewer                                |

Flow: sign in as Alice -> create a doc, format it, upload a `.txt`/`.md` -> **Share** with `bob@ajaia.test` (editor, commenter, or viewer) -> open a second browser/incognito, sign in as Bob -> the doc appears under **Shared with you** (viewers get a read-only editor; commenters can also use the Comments dialog). You can also create an "anyone with the link" share from the Share dialog and open the resulting `/share/<token>` link.

## What is included (Drive folder)

- `ajaia-docs/` - full source code
- `README.md` - local setup + run instructions
- `ARCHITECTURE.md` - design and scope decisions
- `AI-WORKFLOW.md` - how AI was used, what was changed/rejected, how it was verified
- `SUBMISSION.md` - this file
- `supabase/schema.sql` - DB schema + seed data
- video link (above)

## What works (end to end)

- Document create, rename, rich-text editing (bold, italic, underline, H1-H3, bullet/numbered lists)
- Autosave to Postgres; formatting persists across refresh and reopen
- File upload -> new editable document; `.md`/`.markdown` parsed into rich formatting (headings, bold, lists, sanitized), `.txt` as line-per-paragraph
- Version history - documents snapshotted on save, with a History dialog to view timestamps and restore a previous version (owner/editor)
- Live updates across clients - a collaborator's save propagates over Supabase Realtime and is applied automatically; if the receiving user is mid-edit they get an "updated - Load latest" banner instead, so nobody loses keystrokes
- Sharing by email with owner/editor/commenter/viewer roles; owned-vs-shared dashboard split; read-only mode for viewers; owner-only delete and share management
- Link sharing - owner can create an "anyone with the link" share (viewer/commenter/editor); logged-in visitors are granted that role and redirected into the doc, anonymous visitors get a read-only view
- Comments - doc-level comment threads with a Comments dialog to read, post, and delete (commenters and above can post)
- File attachments - upload to a private Supabase Storage bucket, list, download via signed URLs, and remove, from a Files dialog
- Passwordless seeded auth; deployed live on Vercel + Supabase (free tier)
- Unit tests over the access-control core, the Markdown export converter, and the Markdown importer; clean typecheck; passing production build

## Supported file types

`.txt`, `.md`, `.markdown` (max 1 MB) for the "upload becomes a document" flow - stated in the upload UI and the README. `.docx` is **not** supported. The per-document **attachments** feature (Files dialog) accepts any file type; attachments are stored, listed, and downloaded, not parsed into document content.

## What is incomplete (partial or cut)

- **Real-time collaboration is partial.** Edits propagate over Supabase Realtime and land on the other client automatically (with a "Load latest" banner as the fallback when that user is mid-edit), but the unit of sync is a whole-document refetch, not a character-level merge. There is no multi-cursor presence, and simultaneous typing is last-write-wins.
- **Suggestion mode (track changes) is not built.** Doc-level comment threads exist; inline tracked-changes editing does not.
- **Auth is deliberately not production-grade.** Passwordless seeded login over one httpOnly cookie - no passwords, OAuth, email verification, or session rotation. The cookie still gates every server action, and authorization beyond identity is the tested part.
- **No database-layer RLS.** Because identity is custom rather than Supabase Auth, authorization is enforced in application code (`src/lib/access.ts`, unit-tested) with the server-only service-role client. RLS would be the right call on Supabase Auth.
- **No org/teams multi-tenancy.** Sharing is per-document; there are no organizations, teams, or group-level permissions.

## Run locally

```bash
cp .env.local.example .env.local   # fill in the three Supabase keys
npm install
npm run dev                        # http://localhost:3000
npm test                           # unit + integration (Vitest)
npm run test:e2e                   # end-to-end (Playwright)
```

Supabase setup (free tier): create a project, then run `supabase/schema.sql` (tables + the three seeded demo users), `supabase/versions.sql` (version history), and `supabase/features.sql` (commenter role, comments/attachments/links tables, `attachments` Storage bucket) in the SQL Editor. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Full detail in `README.md`.

No credentials are needed to review the live app - sign-in is passwordless account-picking from the seeded users above.

## Deliberate scope cuts (see ARCHITECTURE.md)

- No full real-time co-editing (CRDT/OT multi-cursor) - live updates _are_ implemented and apply automatically over Realtime, but the unit of sync is a whole-document refetch rather than a character-by-character merge
- No suggestion mode (track changes) - comments _are_ implemented, but inline tracked-changes editing is out of scope
- No org/teams multi-tenancy; no production auth (passwords/OAuth)

## What I'd build next with another 2-4 hours

1. Full real-time co-editing (CRDT/OT multi-cursor) on top of the existing Realtime channel
2. Suggestion mode (track changes) on top of the existing comment threads
3. Org/teams multi-tenancy above per-document sharing
4. RLS at the database layer if moving to Supabase Auth

## Stack

Next.js 16 (App Router) + React 19 + TypeScript, Tiptap 3, Supabase Postgres, Tailwind CSS 4, Vitest. Built with Claude Code.
