import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/[id]/stats ─────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: crewId } = await params
    const supabase = createSupabaseAdmin()

    // Only crew members can fetch stats
    const { data: membership } = await supabase
      .from('crew_members')
      .select('id')
      .eq('crew_id', crewId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'NOT_CREW_MEMBER' },
        { status: 403 }
      )
    }

    // Fetch crew to get created_at for scoping orders
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('created_at')
      .eq('id', crewId)
      .single()

    if (crewError || !crew) {
      return NextResponse.json(
        { success: false, error: 'Crew not found' },
        { status: 404 }
      )
    }

    // Get all member user_ids for this crew
    const { data: members, error: membersError } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', crewId)

    if (membersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        data: { total_spend: 0, locked_in_count: 0, total_members: 0 },
      })
    }

    // Sum completed orders attributed to THIS crew specifically
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id, total_amount')
      .eq('crew_id', crewId)
      .eq('status', 'completed')

    const total_spend = (orders ?? []).reduce(
      (sum: number, o: any) => sum + (o.total_amount || 0),
      0
    )

    const lockedInIds = new Set((orders ?? []).map((o: any) => o.user_id))
    const locked_in_count = lockedInIds.size
    const total_members = members.length

    return NextResponse.json({
      success: true,
      data: { total_spend, locked_in_count, total_members },
    })
  } catch (err) {
    console.error('GET /api/v1/crews/[id]/stats error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
