# Architecture note

## The shape of the problem

The brief is open-ended: "a lightweight collaborative document editor inspired by Google Docs" under a tight timebox. Google Docs is enormous, so the real task is **choosing a coherent slice** and shipping it end to end — frontend, backend, persistence, access logic, a test, and a live deploy — rather than half-building many features. I optimized for a small set of flows that work completely and a clear story about what I left out.

## What I prioritized (the core slice)

1. **Document editing that feels real** — a Tiptap (ProseMirror) editor with bold/italic/underline, three heading levels, and bullet/numbered lists, on a paper-style canvas, with debounced **autosave**.
2. **Persistence that survives** — content is stored in Postgres as both HTML (for fast reload/render) and Tiptap JSON (the structured source of truth), so formatting comes back intact after refresh.
3. **Sharing with correct access control** — owner / editor / viewer, surfaced as an "owned vs shared with you" split and a read-only mode for viewers. This is the part most likely to have subtle bugs, so the access rules are isolated and unit-tested.
4. **A real deploy** — one Next.js app on Vercel + Supabase, both free tier, with seeded passwordless accounts so a reviewer can test sharing in under a minute.

## Key decisions

### One Next.js app, route handlers as the API

Frontend and backend live in the same deployable. For a slice this size, a separate backend service would be overhead with no payoff, and it keeps the deploy to a single Vercel project. This matches the "don't overengineer, ship fast" spirit of the role.

### Access control is a pure, tested module (`src/lib/access.ts`)

The riskiest logic is "who can do what." I pulled it into a dependency-free module (`effectiveRole`, `canView`, `canComment`, `canEdit`, `canManage`, `partitionDocuments`) so it is trivial to reason about and to test. Every API route calls these before mutating. The test file (`tests/unit/access.test.ts`) pins the rules: owner beats stray share rows, shares don't leak across documents, commenters can comment but not edit, viewers can't edit, strangers get nothing, and an owned doc never shows up as "shared."

### Lightweight auth, on purpose

There is no password system. A signed-in user is one httpOnly cookie holding their user id; reviewers log in by picking a seeded account. This was a deliberate trade: real auth (passwords, OAuth, email verification, sessions) is a large surface that adds nothing to what is being evaluated here (editing, persistence, sharing) and would eat the timebox. The cookie still gates every server action; the _authorization_ logic beyond identity is the part I invested in and tested.

### Service-role client + app-enforced authorization (no RLS)

Because auth is custom rather than Supabase Auth, I use the service-role client on the server and enforce access in application code via `access.ts`, instead of Postgres Row Level Security. RLS would be the right call with Supabase Auth and more time; with custom identity it would have meant fighting the tooling. The service-role key is server-only and never reaches the browser.

### Storing HTML + JSON

Tiptap can hydrate from HTML, which makes reload simple and fast; JSON is kept as the structured representation for any future needs (export, diffing, real-time). Storing both is cheap and removes a class of "formatting lost on reload" bugs.

## Optional stretches implemented

The brief allows optional stretches. I started with **export** because the content is already stored structured, making it low-risk and fast — which left headroom to add a few more focused, low-risk upgrades on the same structured foundation without destabilizing the core.

### Export to Markdown + PDF

- **Markdown** is generated from the editor's Tiptap JSON by a pure, unit-tested converter (`src/lib/markdown.ts`) — headings, bold/italic/underline/code, and bullet/numbered lists.
- **PDF** reuses a clean, print-optimized route (`/doc/[id]/print`) and the browser's native Save-as-PDF, so there's no heavy PDF dependency.

### Markdown-aware upload

Uploading a `.md`/`.markdown` file now parses it into real rich formatting (headings, bold, lists) via `src/lib/markdownImport.ts`, using `marked` to render Markdown and `sanitize-html` to strip unsafe HTML before it reaches the editor. Plain `.txt` still imports as one paragraph per line. Low-risk because the editor already hydrates from HTML, so this is just a clean conversion step at the upload boundary with explicit sanitization.

### Version history

Documents are snapshotted on save (throttled to ~20s) into a `document_versions` table (`supabase/versions.sql`, `src/services/versions.ts`). A **History** button in the editor opens a dialog (`src/features/document/VersionHistory.tsx`) listing versions with timestamps and a **Restore** action for owners/editors, served by `src/app/api/documents/[id]/versions/route.ts` and `.../versions/restore/route.ts`. Low-risk because snapshots are append-only and restore reuses the existing save path and access checks — no change to the live editing model.

### Live updates (Realtime broadcast)

After a save, the client broadcasts a ping on a `doc:<id>` channel via Supabase Realtime (`src/services/realtimeClient.ts`, `src/features/document/useDocRealtime.ts`); other clients viewing the same document show an "updated by a collaborator — Load latest" banner that refetches through the authenticated API. This is **lightweight live-update notification, not** full multi-cursor co-editing. Low-risk because no document state travels over the channel — only a refetch signal — so authorization and persistence stay entirely in the existing authenticated API.

### Comments + commenter role

Doc-level comment threads (`src/services/comments.ts`, `src/app/api/documents/[id]/comments/`, `src/features/document/Comments.tsx`) let collaborators read, post, and delete comments from a **Comments** dialog. Sharing gains a **commenter** role (owner / editor / commenter / viewer) that can read and comment but not edit, enforced by a new `canComment()` in `access.ts` plus a DB check-constraint update. Low-risk because comments are append-only rows on their own table — they never touch document content — and the role rules live in the same pure, tested access module.

### File attachments (Supabase Storage)

A **Files** dialog (`src/services/attachments.ts`, `src/app/api/documents/[id]/attachments/`, `src/features/document/Attachments.tsx`) uploads files to a private `attachments` Storage bucket, lists them, downloads via short-lived **signed URLs**, and removes them. Low-risk because all bucket access goes through the server-side service-role client and the bucket is private — the browser only ever receives signed URLs, never direct or public object access.

### Link sharing

The owner can mint an "anyone with the link" share at viewer, commenter, or editor role (`src/services/links.ts`, `src/app/api/documents/[id]/links/`, `src/features/document/LinkShareSection.tsx`), managed inside the Share dialog. Visiting `/share/<token>` (`src/app/share/[token]/page.tsx`) resolves the token **server-side**: a logged-in visitor is granted that role and redirected into the document; an anonymous visitor gets a read-only view. Low-risk because the token is resolved on the server against the existing access model and never exposes document data to unauthorized clients (edit access still requires login).

## Deliberate scope cuts (what I did NOT build, and why)

- **Full real-time co-editing (CRDT/OT).** The single biggest cut. Correct multi-cursor collaboration with conflict resolution is a project on its own. I _did_ add lightweight live-update notifications (a "Load latest" banner over Realtime broadcast, see above), but not true multi-cursor co-editing — collaborators still load a refreshed full document rather than seeing character-by-character merges. This is the honest boundary of "lightweight."
- **Suggestion mode (track changes).** Comments _are_ now built (see above), but inline tracked-changes/suggestion editing remains out of scope for the timebox.
- **Org/teams multi-tenancy.** Sharing is per-document; there are no organizations, teams, or group-level permissions.
- **Granular permissions.** Editor / viewer / commenter roles and "anyone with the link" sharing now exist; org/teams-level granular permissions remain cut.
- **Production auth** (passwords, reset, OAuth), rate limiting, and audit logs.

## What I would build next with another 2–4 hours

1. **Full real-time co-editing** — multi-cursor presence and character-level merges via a CRDT/OT layer, building on the existing Realtime channel (a large project beyond the current "Load latest" notification).
2. **Suggestion mode (track changes)** — inline tracked changes on top of the structured Tiptap model and the comment threads that already exist.
3. **Org/teams multi-tenancy** — organizations, teams, and group-level permissions above per-document sharing.
4. **RLS migration** if moving to Supabase Auth, to defend access at the database layer as well as the app layer.

## UI and tooling

- **shadcn/ui** (on Base UI primitives) for buttons, inputs, dialog, dropdown menu, select, and cards — accessible and consistent, copy-in components with no runtime lock-in.
- **Prettier** with `organize-imports` + `tailwindcss` plugins, enforced on every commit via a **husky + lint-staged** pre-commit hook.

## Testing & verification

A three-layer test pyramid:

- **Unit** (`tests/unit/`) — access control (`access.test.ts`, the security-critical core), the Markdown export converter (`markdown.test.ts`), and the Markdown importer (`markdownImport.test.ts`).
- **Integration** (`tests/integration/`) — one file per API resource (`documents`, `document-by-id`, `sharing`, `upload`, and the newer `comments`, `attachments`, `links` routes); drives the route handlers with mocked auth + data layers, asserting status codes and that authorization (401 / 403 / 404 / 200) is enforced at the route boundary.
- **End-to-end** (`e2e/`) — Playwright specs per feature (`documents`, `sharing`, `upload`, `versions`): create → edit → reload-and-persist, rich-text formatting, cross-user sharing across two browser contexts, markdown-upload parsing, and version history. Also runnable against the live deployment via `E2E_BASE_URL`.

Plus `npx tsc --noEmit` (clean), `npm run build` (succeeds), and the end-to-end suite run against the live Vercel + Supabase deployment.

Run: `npm test` (unit + integration) and `npm run test:e2e` (end-to-end).
