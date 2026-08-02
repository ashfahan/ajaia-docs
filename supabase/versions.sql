-- Document version history.
--
-- No RLS policies are defined here on purpose: the application uses its own
-- cookie-based auth and accesses Supabase exclusively through the
-- service-role client (see src/lib/supabaseServer.ts), which BYPASSES RLS.
-- All access control is enforced in application code (src/lib/access.ts).
-- RLS is still enabled below so the table is locked down by default for any
-- non-service-role client (anon/auth keys), matching the rest of the schema.

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  title text not null,
  content_json jsonb,
  content_html text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index if not exists document_versions_doc_idx on document_versions(document_id, created_at desc);

alter table document_versions enable row level security;
