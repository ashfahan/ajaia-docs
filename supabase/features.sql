-- Migration for: commenter role, comments, file attachments, link sharing.
-- Idempotent. Run in the Supabase SQL editor after schema.sql + versions.sql.
-- RLS is enabled on every table but no policies are defined: the app talks to
-- Supabase only through the service-role client (which bypasses RLS) and
-- enforces access in code via src/lib/access.ts.

-- 1) Allow the new 'commenter' role on shares.
alter table document_shares drop constraint if exists document_shares_role_check;
alter table document_shares
  add constraint document_shares_role_check check (role in ('viewer', 'commenter', 'editor'));

-- 2) Doc-level comment threads.
create table if not exists document_comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists document_comments_doc_idx on document_comments(document_id, created_at);
alter table document_comments enable row level security;

-- 3) File attachments (metadata; bytes live in Storage bucket 'attachments').
create table if not exists document_attachments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  uploaded_by uuid references users(id),
  filename text not null,
  mime text,
  size bigint,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists document_attachments_doc_idx on document_attachments(document_id, created_at);
alter table document_attachments enable row level security;

-- 4) Link sharing: a token grants a role to anyone with the link.
create table if not exists document_links (
  token uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'commenter', 'editor')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists document_links_doc_idx on document_links(document_id);
alter table document_links enable row level security;

-- 5) Private Storage bucket for attachments (server reads via signed URLs).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;
