import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── GET /api/v1/users/me/groups ─────────────────────────────────────────────
// Returns the groups the authenticated user belongs to.
// Used by PlanMyDay to surface personalised tag suggestions.

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select(`
        group_id,
        status,
        groups (
          id,
          name,
          slug,
          category
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Get user groups error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch groups' },
        { status: 500 }
      )
    }

    const groups = (memberships ?? [])
      .map((m: any) => m.groups)
      .filter(Boolean)

    return NextResponse.json({ success: true, data: { groups } })
  } catch (err) {
    console.error('GET /api/v1/users/me/groups error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
