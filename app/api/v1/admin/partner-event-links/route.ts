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
    const eventId = body.event_id
    const partnerId = body.partner_id

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    if (!partnerId || typeof partnerId !== 'string') {
      return NextResponse.json({ error: 'partner_id is required' }, { status: 400 })
    }

    const { data: link, error } = await supabase
      .from('partner_event_links')
      .insert({
        event_id: eventId,
        partner_id: partnerId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This partner is already linked to this event' },
          { status: 409 }
        )
      }

      console.error('partner_event_links insert error:', error)
      return NextResponse.json({ error: 'Failed to create partner-event link' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: link })
  } catch (err) {
    console.error('admin/partner-event-links POST error:', err)
    return NextResponse.json({ error: 'Failed to create partner-event link' }, { status: 500 })
  }
}
