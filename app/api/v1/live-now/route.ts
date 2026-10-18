import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const LIVE_LEAD_MINUTES = 30
const LIVE_DEFAULT_DURATION_HOURS = 3
const LIVE_MAX = 10
const LIVE_QUERY_LIMIT = 100
const LIVE_MIN_BEFORE_FALLBACK = 3
const UPCOMING_LIMIT = 8

const EVENT_COLUMNS = 'id, name, flyer_image_url, event_date, event_end_date, category, venue_id'

interface EventRow {
  id: string
  name: string
  flyer_image_url: string | null
  event_date: string
  event_end_date: string | null
  category: string | null
  venue_id: string | null
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Live window: starts within LIVE_LEAD_MINUTES, and has not yet passed
// coalesce(event_end_date, event_date + LIVE_DEFAULT_DURATION_HOURS).
function isLive(event: EventRow, now: number): boolean {
  const start = new Date(event.event_date).getTime()
  if (Number.isNaN(start)) return false
  const end = event.event_end_date
    ? new Date(event.event_end_date).getTime()
    : start + LIVE_DEFAULT_DURATION_HOURS * 60 * 60 * 1000
  if (Number.isNaN(end)) return false
  return start <= now + LIVE_LEAD_MINUTES * 60 * 1000 && now <= end
}

// GET — public, no auth. Events happening now (shuffled), plus upcoming events
// as a fallback when fewer than LIVE_MIN_BEFORE_FALLBACK are live.
export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const windowEndIso = new Date(now + LIVE_LEAD_MINUTES * 60 * 1000).toISOString()
    const noEndCutoffIso = new Date(
      now - LIVE_DEFAULT_DURATION_HOURS * 60 * 60 * 1000
    ).toISOString()

    // PostgREST can't express coalesce(), so the "not ended yet" test is an OR:
    // an explicit end in the future, or no end and a start within the default duration.
    const { data: liveRows, error: liveError } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'active')
      .lte('event_date', windowEndIso)
      .or(
        `event_end_date.gte.${nowIso},and(event_end_date.is.null,event_date.gte.${noEndCutoffIso})`
      )
      .limit(LIVE_QUERY_LIMIT)

    if (liveError) throw liveError

    // Re-check the window in JS before returning.
    const live = shuffle(((liveRows ?? []) as EventRow[]).filter(e => isLive(e, now))).slice(
      0,
      LIVE_MAX
    )

    let upcoming: EventRow[] = []
    if (live.length < LIVE_MIN_BEFORE_FALLBACK) {
      const { data: upcomingRows, error: upcomingError } = await supabase
        .from('events')
        .select(EVENT_COLUMNS)
        .eq('status', 'active')
        .gt('event_date', windowEndIso)
        .order('event_date', { ascending: true })
        .limit(UPCOMING_LIMIT)

      if (upcomingError) throw upcomingError
      upcoming = (upcomingRows ?? []) as EventRow[]
    }

    const venueIds = [
      ...new Set([...live, ...upcoming].map(e => e.venue_id).filter((id): id is string => !!id)),
    ]
    const venueNames: Record<string, string> = {}
    if (venueIds.length > 0) {
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds)

      if (venuesError) {
        console.error('Live now venues error:', venuesError)
      } else {
        for (const v of venues ?? []) venueNames[v.id] = v.name
      }
    }

    const toPublic = (e: EventRow) => ({
      id: e.id,
      name: e.name,
      flyer_image_url: e.flyer_image_url,
      event_date: e.event_date,
      event_end_date: e.event_end_date,
      category: e.category,
      venue_id: e.venue_id,
      venue_name: e.venue_id ? venueNames[e.venue_id] ?? null : null,
    })

    return NextResponse.json(
      { live: live.map(toPublic), upcoming: upcoming.map(toPublic) },
      { headers: NO_STORE }
    )
  } catch (err) {
    console.error('Live now error:', err)
    return NextResponse.json(
      { error: 'Failed to load live events' },
      { status: 500, headers: NO_STORE }
    )
  }
}

// PATCH — admin only, approve/reject/toggle paid
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, paid } = body

    if (!id) return NextResponse.json({ error: 'Missing slot id' }, { status: 400 })

    const updates: any = { updated_at: new Date().toISOString() }
    if (status) {
      updates.status = status
      if (status === 'approved') {
        updates.approved_by = user.id
        updates.approved_at = new Date().toISOString()
      }
    }
    if (typeof paid === 'boolean') updates.paid = paid

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('live_now_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Live now error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update slot' }, { status: 500 })
  }
}
