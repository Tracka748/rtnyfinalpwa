import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── GET /api/v1/crews/[id]/plan-nights/search ─────────────────────────────
// Backs the "Plan Our Crew Night" event picker.
// type=events     → match events.name
// type=workshops  → match events.name, restricted to category='workshop'
// type=venues     → match venues.name, then resolve to their upcoming events
//                    via events.venue_id (the real FK — not businesses/event_partners)
// With q shorter than 2 chars, returns a "default" set instead of empty:
// the top-selling upcoming events for that tab (by events.tickets_sold),
// so the dropdown has content the moment the input is focused.
// Always returns a flat list of events (crew_plan_events only stores event_id).

const DEFAULT_RESULT_LIMIT = 5
const SEARCH_RESULT_LIMIT = 10

type SearchType = 'events' | 'venues' | 'workshops'

function parseType(raw: string | null): SearchType {
  if (raw === 'venues' || raw === 'workshops') return raw
  return 'events'
}

function toResults(events: { id: string; name: string; event_date: string }[] | null) {
  return (events ?? []).map((e) => ({
    event_id: e.id,
    event_name: e.name,
    event_date: e.event_date,
  }))
}

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
    const type = parseType(searchParams.get('type'))
    const nowISO = new Date().toISOString()

    // ── No query yet → default set, top sellers for this tab ────────────────
    if (q.length < 2) {
      let query = supabase
        .from('events')
        .select('id, name, event_date')
        .gte('event_date', nowISO)
        .order('tickets_sold', { ascending: false, nullsFirst: false })
        .limit(DEFAULT_RESULT_LIMIT)

      if (type === 'workshops') {
        query = query.eq('category', 'workshop')
      } else if (type === 'venues') {
        query = query.not('venue_id', 'is', null)
      }

      const { data: events, error } = await query
      if (error) {
        return NextResponse.json(
          { success: false, error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, results: toResults(events) })
    }

    const pattern = `%${q}%`

    if (type === 'events' || type === 'workshops') {
      let query = supabase
        .from('events')
        .select('id, name, event_date')
        .ilike('name', pattern)
        .gte('event_date', nowISO)
        .order('event_date', { ascending: true })
        .limit(SEARCH_RESULT_LIMIT)

      if (type === 'workshops') {
        query = query.eq('category', 'workshop')
      }

      const { data: events, error } = await query
      if (error) {
        return NextResponse.json(
          { success: false, error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, results: toResults(events) })
    }

    // type === 'venues' — find matching venues first, then their events via venue_id
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id')
      .ilike('name', pattern)
      .limit(10)

    if (venuesError) {
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    const venueIds = (venues ?? []).map((v: any) => v.id)
    if (venueIds.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date')
      .in('venue_id', venueIds)
      .gte('event_date', nowISO)
      .order('event_date', { ascending: true })
      .limit(SEARCH_RESULT_LIMIT)

    if (eventsError) {
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, results: toResults(events) })
  } catch (err) {
    console.error('GET /api/v1/crews/[id]/plan-nights/search error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
