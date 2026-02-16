import { createSupabaseServer } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Temporary whitelist for development
const ADMIN_EMAILS = [
  'tracka748@gmail.com',
]

export async function checkIsAdmin() {
  const supabase = await createSupabaseServer()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Check if user is admin (whitelist for dev)
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')

  if (!isAdmin) {
    return {
      error: true,
      response: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
  }

  return { error: false, user }
}