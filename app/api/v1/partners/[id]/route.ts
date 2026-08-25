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
        .select('*, ticket_types (price)')
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

    const [profileResult, partnerResult] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('partners').select('owner_id').eq('id', id).single(),
    ])

    const isAdmin = profileResult.data?.role === 'admin'
    const isOwner = partnerResult.data?.owner_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    const ownerAllowedFields = new Set([
      'display_name', 'tagline', 'bio', 'category', 'contact_email',
      'contact_phone', 'website_url', 'logo_url', 'cover_image_url', 'visible_modules',
    ])

    if (isAdmin) {
      if (typeof body.active === 'boolean') updates.active = body.active
      if (typeof body.verified === 'boolean') updates.verified = body.verified
      if (body.partner_type !== undefined) updates.partner_type = body.partner_type
      if (body.venue_id !== undefined) updates.venue_id = body.venue_id
      if (body.vendor_id !== undefined) updates.vendor_id = body.vendor_id
      if (body.owner_id !== undefined) updates.owner_id = body.owner_id
      if (typeof body.requires_photo_verified_tags === 'boolean') updates.requires_photo_verified_tags = body.requires_photo_verified_tags
    }

    for (const field of ownerAllowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

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
