import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/[id]/plan-nights/search ─────────────────────────────
// Simple ILIKE lookup used by the "Plan Our Crew Night" event picker.
// type=events  → match events.name
// type=venues  → match businesses.name, then resolve to their upcoming events
// Always returns a flat list of events (crew_plan_events only stores event_id).

export async function GET(
  request: NextRequest,
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

    const { searchParams } = request.nextUrl
    const q = (searchParams.get('q') ?? '').trim()
    const type = searchParams.get('type') === 'venues' ? 'venues' : 'events'

    if (q.length < 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const pattern = `%${q}%`
    const nowISO = new Date().toISOString()

    if (type === 'events') {
      const { data: events, error } = await supabase
        .from('events')
        .select('id, name, event_date')
        .ilike('name', pattern)
        .gte('event_date', nowISO)
        .order('event_date', { ascending: true })
        .limit(10)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        results: (events ?? []).map((e: any) => ({
          event_id: e.id,
          event_name: e.name,
          event_date: e.event_date,
        })),
      })
    }

    // type === 'venues' — find matching businesses first, then their events
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .ilike('name', pattern)
      .limit(10)

    if (bizError) {
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    const businessIds = (businesses ?? []).map((b: any) => b.id)
    if (businessIds.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const { data: eventPartners, error: partnersError } = await supabase
      .from('event_partners')
      .select('event_id')
      .in('business_id', businessIds)

    if (partnersError) {
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    const eventIds = [...new Set((eventPartners ?? []).map((ep: any) => ep.event_id))]
    if (eventIds.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date')
      .in('id', eventIds)
      .gte('event_date', nowISO)
      .order('event_date', { ascending: true })
      .limit(10)

    if (eventsError) {
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: (events ?? []).map((e: any) => ({
        event_id: e.id,
        event_name: e.name,
        event_date: e.event_date,
      })),
    })
  } catch (err) {
    console.error('GET /api/v1/crews/[id]/plan-nights/search error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
