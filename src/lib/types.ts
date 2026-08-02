// Domain types shared across the app. Kept framework-agnostic so the
// access-control logic in access.ts stays pure and unit-testable.

export type ShareRole = "viewer" | "commenter" | "editor"

export interface User {
  id: string
  email: string
  display_name: string
}

export interface DocumentRow {
  id: string
  owner_id: string
  title: string
  content_json: unknown | null
  content_html: string | null
  created_at: string
  updated_at: string
}

export interface DocumentShare {
  document_id: string
  user_id: string
  role: ShareRole
}

// What the editor needs to render a doc and decide what controls to show.
export type EffectiveRole = "owner" | ShareRole

export interface DocumentListItem extends DocumentRow {
  owner_email: string
  owner_name: string
  // present only for shared (not owned) docs
  shared_role?: ShareRole
}

export interface DocumentComment {
  id: string
  document_id: string
  author_id: string
  body: string
  created_at: string
  author?: User
}

export interface DocumentAttachment {
  id: string
  document_id: string
  uploaded_by: string | null
  filename: string
  mime: string | null
  size: number | null
  storage_path: string
  created_at: string
}

export interface DocumentLink {
  token: string
  document_id: string
  role: ShareRole
  created_at: string
}
