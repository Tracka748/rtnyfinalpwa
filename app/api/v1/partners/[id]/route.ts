import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const [venueResult, vendorResult, mediaResult, supporterResult] = await Promise.all([
      partner.venue_id
        ? supabase.from('venues').select('*').eq('id', partner.venue_id).single()
        : Promise.resolve({ data: null, error: null }),
      partner.vendor_id
        ? supabase.from('vendors').select('*').eq('id', partner.vendor_id).single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('partner_media')
        .select('*')
        .eq('partner_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('partner_supporters')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', id),
    ])

    if (venueResult.error) console.error('venues fetch error:', venueResult.error)
    if (vendorResult.error) console.error('vendors fetch error:', vendorResult.error)
    if (mediaResult.error) console.error('partner_media fetch error:', mediaResult.error)
    if (supporterResult.error) console.error('partner_supporters fetch error:', supporterResult.error)

    let upcoming_events: unknown[] = []
    const modules = partner.visible_modules as Record<string, boolean> | null
    if (modules?.upcoming_events && partner.venue_id) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('venue_id', partner.venue_id)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(6)

      if (eventsError) {
        console.error('events fetch error:', eventsError)
      } else {
        upcoming_events = events ?? []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        partner,
        venue: venueResult.data ?? null,
        vendor: vendorResult.data ?? null,
        media: mediaResult.data ?? [],
        supporter_count: supporterResult.count ?? 0,
        upcoming_events,
      },
    })
  } catch (err) {
    console.error('partners/[id] route error:', err)
    return NextResponse.json({ error: 'Failed to fetch partner' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()
    const supabaseServer = await createSupabaseServer()

    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.active === 'boolean') updates.active = body.active
    if (typeof body.verified === 'boolean') updates.verified = body.verified
    if (body.visible_modules !== undefined) updates.visible_modules = body.visible_modules

    const { data: updatedPartner, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedPartner })
  } catch (err) {
    console.error('partners/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
  }
}
