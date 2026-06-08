# Ajaia Docs

A lightweight collaborative document editor (a focused Google-Docs-style slice) built for the Ajaia AI-Native Full Stack assessment.

**Live demo:** <https://ajaia-docs-psi.vercel.app>
**Walkthrough video + source + docs (Google Drive):** <https://drive.google.com/drive/folders/1EXcbWzbjVegdhpeT5qu0DL8GhfukmW74>
**Repository:** <https://github.com/ashfahan/ajaia-docs> (public)

## What it does

- **Create & edit documents** in the browser with rich text: bold, italic, underline, H1/H2/H3 headings, bulleted and numbered lists. Rename and reopen documents.
- **Autosave** — edits persist to Postgres automatically (debounced), survive refresh, and preserve formatting.
- **File upload** — import a file and it becomes a new editable document. `.md`/`.markdown` is parsed into real rich formatting (headings, bold, lists); `.txt` becomes one paragraph per line.
- **Version history** — documents are snapshotted on save (throttled). A **History** button opens a dialog listing past versions with timestamps and a one-click **Restore** (owner/editor).
- **Live updates** — when a collaborator saves, other clients viewing the same document see an "updated — Load latest" banner and can refetch on demand (Supabase Realtime).
- **Sharing** — the owner can grant another registered user **owner / editor / commenter / viewer** access by email, or create an **"anyone with the link"** share (viewer, commenter, or editor) for quick access. The dashboard shows a clear split between _your documents_ and _shared with you_, and viewers get a read-only editor.
- **Comments** — doc-level comment threads. A **Comments** button in the editor opens a dialog to read, post, and delete comments (commenters and above can post).
- **File attachments** — a **Files** button opens a dialog to upload files to a document (stored in a private Supabase Storage bucket), list them, download via signed URLs, and remove them.
- **Export (stretch)** — download any document as **Markdown** or **PDF**.
- **Passwordless demo auth** — sign in as a seeded user so reviewers can test the sharing flow in seconds (see below).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** — UI and API in one deployable.
- **Tiptap 3** (ProseMirror) — the rich-text editor.
- **marked** + **sanitize-html** — parse uploaded Markdown into sanitized rich text (XSS-safe).
- **shadcn/ui** (on Base UI) — accessible UI primitives.
- **Supabase Postgres** — persistence. **Tailwind CSS 4** — styling.
- **Vitest** (unit + integration) + **Playwright** (e2e) — tests. **Prettier** + husky pre-commit hook — formatting.

## Run locally

### 1. Create a Supabase project (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and **Run**. This creates the tables and seeds three demo users. Then run [`supabase/versions.sql`](./supabase/versions.sql) (version history) and [`supabase/features.sql`](./supabase/features.sql) (commenter role constraint, comments/attachments/links tables, and the `attachments` Storage bucket).

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in from your Supabase project (Project Settings):

- `NEXT_PUBLIC_SUPABASE_URL` — Data API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only)

### 3. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 4. Run tests

```bash
npm test
```

## Seeded demo users (passwordless)

| Email              | Role in demo |
| ------------------ | ------------ |
| `alice@ajaia.test` | owner demo   |
| `bob@ajaia.test`   | collaborator |
| `carol@ajaia.test` | reviewer     |

**To test sharing:** sign in as `alice@ajaia.test` in one browser, create/share a document with `bob@ajaia.test` (as editor or viewer), then sign in as Bob in a second browser (or incognito window) and find it under **Shared with you**.

## Supported upload types

`.txt`, `.md`, `.markdown` (max 1 MB). `.md`/`.markdown` files are parsed into rich text — headings, bold, and lists — and sanitized for XSS safety. `.txt` files are imported as plain text, with each line becoming a paragraph.

## Project layout

```
src/
  app/                   Next.js routes (thin; delegate to features/services)
    api/                 route handlers (auth, documents, share, upload, versions, comments, attachments, links, users)
    login/ dashboard/ doc/[id]/   page entry points + the print route
    share/[token]/       link-share landing (grant role + redirect, or read-only view)
  features/              feature UI grouped by domain
    document/            editor, toolbar, share dialog, version history, realtime hook, comments, attachments, link-share section
    dashboard/           dashboard actions (create / upload / sign out)
  services/              server-side I/O + domain data-access
    auth.ts              cookie-based current user (seeded login)
    documents.ts         document data-access (Supabase)
    versions.ts          version snapshot / restore
    comments.ts          doc-level comment threads
    attachments.ts       file attachments (Supabase Storage + signed URLs)
    links.ts             "anyone with the link" share tokens
    supabaseServer.ts    service-role client (server only)
    realtimeClient.ts    browser Supabase client (Realtime broadcast)
  lib/                   pure, cross-cutting modules
    access.ts            access-control logic (unit-tested) — authorization source of truth
    markdown.ts          Tiptap JSON -> Markdown (export)
    markdownImport.ts    Markdown -> sanitized HTML (upload)
    types.ts             shared domain types
    utils.ts             cn() helper (shadcn)
  components/ui/         shadcn/ui primitives
tests/
  unit/                  access / markdown / markdownImport
  integration/           API route handlers, per resource
e2e/                     Playwright specs, per feature
supabase/                schema.sql + versions.sql + features.sql
```

See `ARCHITECTURE.md` for the design and scope decisions, and `AI-WORKFLOW.md` for how AI was used to build this.
