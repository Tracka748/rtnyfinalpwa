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
    if (body.partner_type !== undefined) updates.partner_type = body.partner_type
    if (body.venue_id !== undefined) updates.venue_id = body.venue_id
    if (body.vendor_id !== undefined) updates.vendor_id = body.vendor_id
    if (body.owner_id !== undefined) updates.owner_id = body.owner_id
    if (body.display_name !== undefined) updates.display_name = body.display_name
    if (body.tagline !== undefined) updates.tagline = body.tagline
    if (body.bio !== undefined) updates.bio = body.bio
    if (body.category !== undefined) updates.category = body.category
    if (body.contact_email !== undefined) updates.contact_email = body.contact_email
    if (body.contact_phone !== undefined) updates.contact_phone = body.contact_phone
    if (body.website_url !== undefined) updates.website_url = body.website_url
    if (body.logo_url !== undefined) updates.logo_url = body.logo_url
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url

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

export async function DELETE(
  _request: NextRequest,
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

    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('partners/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
  }
}
