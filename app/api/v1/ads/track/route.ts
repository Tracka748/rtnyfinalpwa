// app/api/v1/ads/track/route.ts
// Fire-and-forget ad impression/click tracking. Never surfaces failures to the client.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

const EVENT_TYPES = ['impression', 'click'] as const
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ad_id: adId, event_type: eventType, session_id: sessionId } = body

  if (!EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  if (typeof adId !== 'string' || !UUID_REGEX.test(adId)) {
    return NextResponse.json({ error: 'Invalid ad_id' }, { status: 400 })
  }

  try {
    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()

    const supabase = createSupabaseAdmin()

    const { error } = await supabase.from('ad_events').insert({
      ad_id: adId,
      event_type: eventType,
      session_id: sessionId ?? null,
      user_id: user?.id ?? null,
    })

    if (error) {
      console.error('ad_events insert error:', error)
    }
  } catch (err) {
    console.error('ads/track POST error:', err)
  }

  return NextResponse.json({ success: true })
}
