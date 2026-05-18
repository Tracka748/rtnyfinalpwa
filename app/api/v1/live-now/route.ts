import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET — public, returns currently active live slots
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: slots, error } = await supabase
      .from('live_now_slots')
      .select('id, event_id, slot_type')
      .eq('status', 'active')
      .eq('paid', true)
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at', new Date().toISOString())

    if (error) throw error
    if (!slots?.length) return NextResponse.json({ success: true, data: [] })

    // Fetch event details separately (simple over complex join)
    const eventIds = slots.map(s => s.event_id)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, flyer_image_url, venue_id, promoter_id, category')
      .in('id', eventIds)

    if (eventsError) throw eventsError

    const venueIds = [...new Set(events?.map(e => e.venue_id).filter(Boolean))]
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .in('id', venueIds)

    const venueMap = Object.fromEntries((venues || []).map(v => [v.id, v]))
    const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]))

    const data = slots.map(slot => {
      const event = eventMap[slot.event_id]
      const venue = event?.venue_id ? venueMap[event.venue_id] : null
      return {
        id: slot.id,
        slot_type: slot.slot_type,
        event_id: slot.event_id,
        title: event?.name ?? 'Unknown Event',
        venue: venue?.name ?? 'Location TBD',
        image_url: event?.flyer_image_url ?? null,
        category: event?.category ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Live now error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to load live slots' }, { status: 500 })
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
