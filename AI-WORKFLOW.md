# AI workflow note

## Tools used

- **Claude Code** (Anthropic's agentic CLI, Opus model) as the primary build harness — planning, scaffolding, code, tests, and docs, running the typecheck/test/build loop, and driving the Supabase + Vercel setup.
- **Parallel sub-agents** for independent work: once the core was stable I fanned out isolated, well-scoped tasks (Markdown-import module, version-history backend + dialog, the Realtime hook, the shadcn refactor, splitting the test suites) to concurrent agents, then did the thin integration myself so nothing collided.
- The Next.js / Tiptap / Supabase CLIs for scaffolding and verification.

## How I worked (AI as leverage, not autopilot)

I treated this like a real delivery, with AI doing the heavy lifting on mechanical work while I owned the decisions:

1. **Decompose first.** Before any code I split the assignment into required core (editing, upload, sharing, persistence, quality) vs. optional stretch, with an explicit time budget and a written scope-cut list. The core landed first; the additional features (export, Markdown-aware upload, version history, live updates) were added deliberately on top of a green, tested base — not by drifting mid-build.
2. **Pin the risky core, then test it.** I isolated the access-control logic into a single pure module and had tests written against it up front, because that is where correctness actually matters. The tests are the thing I trust, not the prose.
3. **Tight verify loop.** After each layer (foundation → API → UI → each feature → restructure) I ran `tsc --noEmit`, the Vitest suites, and a production `build`, plus Playwright end-to-end. Nothing was "done" until those were green — including against the live deployment.

## Where AI materially sped things up

- **Scaffolding and boilerplate** — the Next.js app, route-handler skeletons, the Supabase data-access layer, and the shadcn/ui refactor came together far faster than hand-writing.
- **Tiptap integration** — wiring the editor, toolbar, and autosave (including the SSR `immediatelyRender: false` detail and the Tailwind-preflight CSS the rich-text output needs).
- **Breadth via parallelism** — building the three stretch features and splitting the test pyramid (unit / integration / e2e) concurrently across sub-agents, each on its own files.
- **Test enumeration** — the access-control matrix (owner/editor/viewer/stranger, cross-document leakage, owned-not-shared) and the per-resource API integration cases.

## What I changed or rejected from AI output

- **No Supabase RLS.** First instinct was Postgres RLS for access control; I rejected it because the app uses custom cookie auth, not Supabase Auth, so RLS would fight the tooling. Authorization lives in the tested `access.ts` module instead, with the trade-off documented.
- **Cut a Supabase Storage bucket.** An early plan added attachment storage; I dropped it — "uploaded file becomes a document" satisfies the requirement with one less dependency for a reviewer to configure.
- **Kept auth deliberately thin.** Passwordless seeded login is a conscious cut: instant for reviewers, and it keeps the timebox on the graded features rather than a real auth system.
- **Live updates, not full CRDT.** When adding collaboration I scoped it to a Realtime "Load latest" notification rather than multi-cursor co-editing — the honest, low-risk version — and broadcast only a refetch signal so no document data rides the channel.
- **Storing both HTML and JSON** was a considered choice (fast reload + structured source), not an accident.

## How I verified correctness, UX, and reliability

- **Correctness:** a three-layer test pyramid — unit (access control, Markdown export, Markdown import), integration (API route handlers per resource, asserting 401/403/404/200 authorization), and Playwright end-to-end — all green, with the e2e suite also run against the live Vercel + Supabase deployment. Clean `tsc`; input validation + error handling in every route.
- **UX:** walked the full flow end to end — create, every formatting type, refresh-to-persist, Markdown upload parsing, share as editor and viewer (read-only confirmed), cross-user live "Load latest", version snapshot + restore, export — and confirmed a stranger gets a 404.
- **Reliability:** production build passes; the service-role key is confined to server code; saves are debounced with a visible state and surfaced errors; the Realtime path is wrapped so a hiccup never crashes the editor.

The judgment — what to build, what to cut, what to test, what to reject — was mine. AI made executing that judgment fast.
