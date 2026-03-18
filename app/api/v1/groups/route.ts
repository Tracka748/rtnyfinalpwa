import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    // Check if user is authenticated to add membership info
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id)

      const memberGroupIds = new Set((memberships || []).map(m => m.group_id))
      const groupsWithMembership = (groups || []).map(g => ({
        ...g,
        is_member: memberGroupIds.has(g.id),
      }))

      return NextResponse.json({ success: true, data: groupsWithMembership })
    }

    return NextResponse.json({ success: true, data: groups || [] })
  } catch (error: any) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch groups' }, { status: 500 })
  }
}
