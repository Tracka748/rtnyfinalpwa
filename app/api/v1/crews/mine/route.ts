import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/mine ───────────────────────────────────────────────────

export async function GET() {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAdmin()

    // Fetch every crew_members row for this user, nesting the crew data plus
    // an aggregate count of all members in that crew.
    const { data: memberships, error } = await supabase
      .from('crew_members')
      .select(`
        role,
        joined_at,
        crews (
          id,
          name,
          description,
          is_private,
          max_members,
          invite_code,
          created_by,
          created_at,
          crew_status,
          crew_members ( count )
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Get my crews error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch crews' },
        { status: 500 }
      )
    }

    // Flatten each membership row into a crew object with member_count / user_role
    const crews = (memberships ?? []).map((m: any) => {
      const crew = m.crews
      // Supabase returns count aggregate as [{ count: number }]
      const member_count: number = crew?.crew_members?.[0]?.count ?? 0
      const { crew_members: _drop, ...crewFields } = crew ?? {}
      return {
        ...crewFields,
        member_count,
        user_role:  m.role,
        joined_at:  m.joined_at,
      }
    })

    return NextResponse.json({ success: true, data: { crews } })
  } catch (err) {
    console.error('GET /api/v1/crews/mine error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
