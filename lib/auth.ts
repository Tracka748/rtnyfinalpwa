// lib/auth.ts
import { createSupabaseServer } from './supabase'

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServer()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, error: error?.message || 'Not authenticated' }
    }
    
    return { user, error: null }
  } catch (error) {
    return { 
      user: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
