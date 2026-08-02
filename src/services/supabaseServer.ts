import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Server-only Supabase client using the service-role key.
//
// Design note: this app uses its own lightweight cookie-based auth (see
// auth.ts) rather than Supabase Auth, so we do NOT rely on Postgres RLS.
// All access control is enforced in application code via src/lib/access.ts
// (which is unit-tested). The service-role client is therefore only ever
// imported from server route handlers — never shipped to the browser.

let cached: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    )
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
