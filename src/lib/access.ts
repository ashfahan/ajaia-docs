// Pure access-control logic. No I/O, no framework imports — this is the
// security-critical core, so it lives here on its own and is unit-tested
// (see src/lib/access.test.ts). Every API route enforces access by calling
// these functions; they are the single source of truth for "who can do what".

import type { DocumentRow, DocumentShare, EffectiveRole, ShareRole } from "./types"

/**
 * The role a user effectively has on a document, or null if no access.
 * Owner always wins over any share row.
 */
export function effectiveRole(
  doc: Pick<DocumentRow, "id" | "owner_id">,
  shares: DocumentShare[],
  userId: string | null | undefined
): EffectiveRole | null {
  if (!userId) return null
  if (doc.owner_id === userId) return "owner"
  const share = shares.find((s) => s.document_id === doc.id && s.user_id === userId)
  return share ? share.role : null
}

/** Can the user open/read the document at all? */
export function canView(
  doc: Pick<DocumentRow, "id" | "owner_id">,
  shares: DocumentShare[],
  userId: string | null | undefined
): boolean {
  return effectiveRole(doc, shares, userId) !== null
}

/** Can the user change the document content/title? Owners and editors only. */
export function canEdit(
  doc: Pick<DocumentRow, "id" | "owner_id">,
  shares: DocumentShare[],
  userId: string | null | undefined
): boolean {
  const role = effectiveRole(doc, shares, userId)
  return role === "owner" || role === "editor"
}

/** Can the user comment? Owners, editors, and commenters (not plain viewers). */
export function canComment(
  doc: Pick<DocumentRow, "id" | "owner_id">,
  shares: DocumentShare[],
  userId: string | null | undefined
): boolean {
  const role = effectiveRole(doc, shares, userId)
  return role === "owner" || role === "editor" || role === "commenter"
}

/** Owner-only actions: delete the doc, manage sharing. */
export function canManage(doc: Pick<DocumentRow, "id" | "owner_id">, userId: string | null | undefined): boolean {
  return !!userId && doc.owner_id === userId
}

/**
 * Split a set of accessible documents into the two buckets the dashboard
 * shows: documents the user owns vs. documents shared with them.
 * A document the user owns never appears in "shared" even if a stray share
 * row exists.
 */
export function partitionDocuments<T extends Pick<DocumentRow, "id" | "owner_id">>(
  docs: T[],
  shares: DocumentShare[],
  userId: string
): { owned: T[]; shared: Array<T & { shared_role: ShareRole }> } {
  const owned: T[] = []
  const shared: Array<T & { shared_role: ShareRole }> = []
  for (const doc of docs) {
    if (doc.owner_id === userId) {
      owned.push(doc)
      continue
    }
    const share = shares.find((s) => s.document_id === doc.id && s.user_id === userId)
    if (share) shared.push({ ...doc, shared_role: share.role })
  }
  return { owned, shared }
}
