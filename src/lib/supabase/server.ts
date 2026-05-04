import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/** Use this in API route handlers (server-side only). */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
