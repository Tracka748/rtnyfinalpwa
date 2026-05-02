import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/[id] ───────────────────────────────────────────────────
// Semi-public: public crews are visible to anyone; private crews require membership.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: crewId } = await params
    const supabase = createSupabaseAdmin()
    const { user } = await getCurrentUser()

    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('id, name, invite_code, is_public, created_by, created_at')
      .eq('id', crewId)
      .single()

    if (crewError || !crew) {
      return NextResponse.json({ error: 'Crew not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (!(crew.is_public ?? false)) {
      if (!user) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
      }
      const { data: membership } = await supabase
        .from('crew_members')
        .select('id')
        .eq('crew_id', crewId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
      }
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('crew_members')
      .select('user_id, joined_at')
      .eq('crew_id', crewId)

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch members', code: 'DB_ERROR' }, { status: 500 })
    }

    const memberIds = (memberRows ?? []).map((m: any) => m.user_id as string)

    const { data: profileRows } = memberIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', memberIds)
      : { data: [] as any[] }

    const { data: orders } = memberIds.length > 0
      ? await supabase
          .from('orders')
          .select('user_id, total_amount')
          .in('user_id', memberIds)
          .eq('status', 'completed')
          .gte('created_at', crew.created_at)
      : { data: [] as any[] }

    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]))
    const ordersData = orders ?? []
    const lockedInIds = new Set(ordersData.map((o: any) => o.user_id as string))
    const total_spend = ordersData.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0)

    const members = (memberRows ?? []).map((m: any) => {
      const profile = profileMap.get(m.user_id) as any
      return {
        user_id: m.user_id,
        joined_at: m.joined_at,
        first_name: profile?.first_name ?? '',
        last_name: profile?.last_name ?? '',
        has_purchased: lockedInIds.has(m.user_id),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: crew.id,
        name: crew.name,
        invite_code: crew.invite_code,
        is_public: crew.is_public ?? false,
        created_by: crew.created_by,
        created_at: crew.created_at,
        members,
        total_spend,
        locked_in_count: lockedInIds.size,
        total_members: memberIds.length,
      },
    })
  } catch (err) {
    console.error('GET /api/v1/crews/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/v1/crews/[id] ─────────────────────────────────────────────────
// Required migration: ALTER TABLE crews ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

export async function PATCH(
  request: Request,
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { is_public } = body as { is_public: unknown }
    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_public must be a boolean' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('id, created_by')
      .eq('id', crewId)
      .single()

    if (crewError || !crew) {
      return NextResponse.json(
        { success: false, error: 'Crew not found' },
        { status: 404 }
      )
    }

    if (crew.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the crew creator can update this' },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabase
      .from('crews')
      .update({ is_public } as any)
      .eq('id', crewId)

    if (updateError) {
      console.error('Update crew error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update crew' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/v1/crews/[id] error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
