// lib/auth/get-user.ts
// Helper function to get the current authenticated user
// Updated to use your existing createSupabaseServer helper

import { createSupabaseServer } from '@/lib/supabase'

export async function getCurrentUser() {
  const supabase = await createSupabaseServer()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { user: null, error }
  }

  // Also fetch user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { 
    user: {
      ...user,
      profile
    }, 
    error: null 
  }
}