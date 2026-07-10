import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'

// ─── GET /api/v1/crews/[id]/recommendations ────────────────────────────────
// Events in the next 14 days that have either an active bundle or a crew RSVP.

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

    // Only crew members can fetch recommendations
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

    const now = new Date()
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    // Events in the next 14 days
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, event_date, venues(name)')
      .gte('event_date', now.toISOString())
      .lte('event_date', in14Days.toISOString())
      .order('event_date', { ascending: true })

    if (eventsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ success: true, recommendations: [] })
    }

    const eventIds = events.map((e: any) => e.id)

    // Bundles for these events
    const { data: bundles, error: bundlesError } = await supabase
      .from('bundles')
      .select('id, event_id, name, discount_percent, tags, min_tickets')
      .in('event_id', eventIds)

    if (bundlesError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch bundles' },
        { status: 500 }
      )
    }

    // Crew RSVPs for these events, scoped to this crew
    const { data: rsvps, error: rsvpsError } = await supabase
      .from('crew_rsvps')
      .select('event_id, status')
      .eq('crew_id', crewId)
      .in('event_id', eventIds)

    if (rsvpsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch crew RSVPs' },
        { status: 500 }
      )
    }

    // Primary business partners for these events
    const { data: eventPartners, error: partnersError } = await supabase
      .from('event_partners')
      .select('event_id, businesses(name, logo_url)')
      .eq('is_primary', true)
      .in('event_id', eventIds)

    if (partnersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event partners' },
        { status: 500 }
      )
    }

    const bundleByEvent = new Map((bundles ?? []).map((b: any) => [b.event_id, b]))

    const rsvpCountsByEvent = new Map<string, { going_count: number; maybe_count: number }>()
    for (const r of rsvps ?? []) {
      const counts = rsvpCountsByEvent.get(r.event_id) ?? { going_count: 0, maybe_count: 0 }
      if (r.status === 'going') counts.going_count += 1
      else if (r.status === 'maybe') counts.maybe_count += 1
      rsvpCountsByEvent.set(r.event_id, counts)
    }

    const primaryBusinessByEvent = new Map(
      (eventPartners ?? []).map((ep: any) => [ep.event_id, ep.businesses])
    )

    const recommendations = events
      .filter((e: any) => bundleByEvent.has(e.id) || rsvpCountsByEvent.has(e.id))
      .map((e: any) => {
        const bundle = bundleByEvent.get(e.id)
        const rsvp = rsvpCountsByEvent.get(e.id)
        const business = primaryBusinessByEvent.get(e.id)

        return {
          event_id: e.id,
          event_name: e.name,
          event_date: e.event_date,
          event_time: e.event_date
            ? format(new Date(e.event_date), 'h:mm a')
            : null,
          venue: e.venues?.name ?? null,
          bundle: bundle
            ? {
                id: bundle.id,
                name: bundle.name,
                discount_percent: bundle.discount_percent,
                tags: bundle.tags,
                min_tickets: bundle.min_tickets,
              }
            : null,
          rsvp: rsvp
            ? { going_count: rsvp.going_count, maybe_count: rsvp.maybe_count }
            : null,
          primary_business: business
            ? { name: business.name, logo_url: business.logo_url }
            : null,
        }
      })

    return NextResponse.json({ success: true, recommendations })
  } catch (err) {
    console.error('GET /api/v1/crews/[id]/recommendations error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
