// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client for client-side operations
export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server client for API routes and server components
export async function createSupabaseServer() {
  // `cookies()` may return a promise type in some Next versions, so await and cast
  const cookieStore: any = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get?.(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set?.({ name, value, ...options })
        } catch (error) {
          // Handle cookie setting errors
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set?.({ name, value: '', ...options })
        } catch (error) {
          // Handle cookie removal errors
        }
      }
    }
  })
}

// Admin client for privileged operations (server-side only)
export function createSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Legacy browser client (for compatibility)
export const supabase = createSupabaseBrowser()
