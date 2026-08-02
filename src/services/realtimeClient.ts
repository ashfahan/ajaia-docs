// Browser-only Supabase client used solely for Supabase Realtime BROADCAST.
//
// This client never reads or writes document data. It only broadcasts lightweight
// "this doc changed" pings between connected clients so that other open editors
// know to refetch. The actual document data is always refetched through the app's
// own authenticated API — never through this anon-key client. As a result, no
// document data is ever exposed via the anon key or the Realtime channel; the
// broadcast payload contains nothing but the originating user's id.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

/**
 * Lazily creates and returns a singleton browser Supabase client for Realtime
 * broadcast. Browser-only.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
  }
  return client
}
