-- Ajaia Docs schema. Run this once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> paste -> Run) after creating the project.
-- Safe to re-run: uses "if not exists" / "on conflict do nothing".

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null default 'Untitled document',
  content_json jsonb,
  content_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_id_idx on documents(owner_id);

create table if not exists document_shares (
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index if not exists document_shares_user_id_idx on document_shares(user_id);

-- Seeded reviewer accounts. Passwordless login: pick one of these on the
-- login screen. Use two different ones in two browsers/tabs to test sharing.
insert into users (email, display_name) values
  ('alice@ajaia.test', 'Alice (owner demo)'),
  ('bob@ajaia.test',   'Bob (collaborator)'),
  ('carol@ajaia.test', 'Carol (reviewer)')
on conflict (email) do nothing;
