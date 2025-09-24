import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Read values from environment. Fill these in your `.env.local`.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV !== "production") {
    // Warn during local development so users remember to populate .env.local
    // (Don't throw here to avoid breaking automated tools that may run in CI without envs.)
    // eslint-disable-next-line no-console
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add them to .env.local"
    )
  }
}

// Browser / client-safe Supabase instance (uses public anon key)
export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// Creates a Supabase client using the service role key. Only use on the server.
export function createServiceRoleClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This key should only be used server-side and stored in environment variables."
    )
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

export type { SupabaseClient }
