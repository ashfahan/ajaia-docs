import type { User } from "@/lib/types"
import { cookies } from "next/headers"
import { getServiceClient } from "./supabaseServer"

// Lightweight auth: a signed-in user is identified by a single httpOnly
// cookie holding their user id. There are no passwords — reviewers log in by
// picking one of the seeded accounts. This is a deliberate scope cut for the
// timebox (documented in the architecture note); production auth (passwords,
// OAuth, sessions) is out of scope. The cookie still gates every server
// action, and access control beyond identity lives in access.ts.

export const AUTH_COOKIE = "ajaia_uid"

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies()
  const uid = store.get(AUTH_COOKIE)?.value
  if (!uid) return null

  const supabase = getServiceClient()
  const { data, error } = await supabase.from("users").select("id, email, display_name").eq("id", uid).single()

  if (error || !data) return null
  return data as User
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated")
    this.name = "UnauthorizedError"
  }
}
