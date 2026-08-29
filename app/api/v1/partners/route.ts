import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
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

    const { data: partner, error } = await supabase
      .from('partners')
      .insert({
        owner_id: body.owner_id || user.id,
        partner_type: body.partner_type,
        venue_id: body.venue_id ?? null,
        vendor_id: body.vendor_id ?? null,
        display_name: body.display_name,
        tagline: body.tagline ?? null,
        bio: body.bio ?? null,
        category: body.category ?? null,
        category_id: body.category_id ?? null,
        contact_email: body.contact_email ?? null,
        contact_phone: body.contact_phone ?? null,
        website_url: body.website_url ?? null,
        logo_url: body.logo_url ?? null,
        cover_image_url: body.cover_image_url ?? null,
        verified: body.verified ?? false,
        visible_modules: body.visible_modules ?? {},
        active: true,
        supporter_count: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('partners POST error:', error)
      return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { id: partner.id } })
  } catch (err) {
    console.error('partners POST route error:', err)
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
