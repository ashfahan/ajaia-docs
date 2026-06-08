# Ajaia Docs - Agent Guide

Ajaia Docs is a lightweight collaborative document editor (a focused, Google-Docs-style slice) built for the Ajaia AI-native full-stack assessment. It supports rich-text editing with debounced autosave, `.txt`/`.md` upload, owner/editor/commenter/viewer sharing by email plus "anyone with the link" sharing, doc-level comments, file attachments (Supabase Storage), and Markdown/PDF export.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** — UI and API in one deployable.
- **Tiptap 3** (ProseMirror) — the rich-text editor.
- **shadcn/ui** (on Base UI) — accessible UI primitives.
- **Supabase Postgres** — persistence.
- **Tailwind CSS 4** — styling.
- **Vitest** (unit + integration) + **Playwright** (e2e) — tests.
- Deployed on **Vercel**.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000).
- `npm run build` — production build.
- `npm test` — unit + integration tests via Vitest (`npm run test:watch` for watch mode).
- `npm run test:e2e` — Playwright end-to-end tests.
- `npm run format` — Prettier write (`npm run format:check` to verify).
- `npm run lint` — ESLint.

A **husky** pre-commit hook runs **lint-staged** (Prettier) on staged files.

## Architecture / where things live

Feature-based layout: `src/features` (UI by domain) + `src/services` (I/O + data access) + `src/lib` (pure cross-cutting). Routes in `src/app` stay thin and delegate.

- `src/lib/access.ts` — **PURE**, unit-tested access-control logic (owner/editor/commenter/viewer): `effectiveRole`, `canView`, `canComment`, `canEdit`, `canManage`, `partitionDocuments`. The single source of truth for authorization; every API route enforces via these. Keep it pure — no I/O, no framework imports.
- `src/lib/` also: `markdown.ts` (Tiptap-JSON → Markdown export), `markdownImport.ts` (Markdown → sanitized HTML on upload), `types.ts` (shared domain types), `utils.ts` (shadcn `cn`).
- `src/services/` — `documents.ts` + `versions.ts` (Supabase data access, `server-only`), `comments.ts` (doc-level comment threads), `attachments.ts` (Supabase Storage uploads + signed URLs), `links.ts` ("anyone with the link" share tokens), `auth.ts` (cookie-based current user; passwordless seeded accounts), `supabaseServer.ts` (service-role client; RLS not used, access enforced in app code, key server-only), `realtimeClient.ts` (browser Supabase client for Realtime broadcast).
- `src/features/document/` — editor + toolbar, share dialog, version history, the realtime hook, the print component (PDF export), `Comments.tsx`, `Attachments.tsx`, and `LinkShareSection.tsx`. `src/features/dashboard/` — dashboard actions (create / upload / sign out).
- `src/app/api/**` — thin route handlers: auth → access check → service layer (includes `documents/[id]/comments`, `.../attachments`, `.../links`). `src/app/doc/[id]/` (+ `/print`), `src/app/dashboard/`, `src/app/login/`, `src/app/share/[token]/` (link-share landing) — page entry points.
- `src/components/ui/` — shadcn components (generated; avoid hand-editing).
- `tests/unit/` (access, markdown, markdownImport), `tests/integration/` (API handlers per resource, including comments/attachments/links), `e2e/` (Playwright specs per feature). `supabase/` — `schema.sql` + `versions.sql` + `features.sql` (commenter constraint, comments/attachments/links tables, Storage bucket).
- `supabase/*.sql` — schema + seed data; run in the Supabase SQL editor.

## Conventions

- TypeScript **strict**.
- Route handlers stay **thin** and delegate to `src/lib/`.
- Keep all access decisions in `access.ts` and unit-test them.
- Format with Prettier (`organize-imports` + `tailwindcss` plugins).
- Never commit secrets: `.env.local` is gitignored; `.env.local.example` is the template.

## Env

Required (see `.env.local.example` and `README.md`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
