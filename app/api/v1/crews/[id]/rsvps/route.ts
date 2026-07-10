import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/v1/crews/[id]/rsvps ─────────────────────────────────────────
// Upsert the requesting user's RSVP for an event within this crew.

export async function POST(
  request: Request,
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

    // Only crew members can RSVP
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { event_id, status } = body as { event_id: unknown; status: unknown }

    if (!event_id || typeof event_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'event_id is required' },
        { status: 400 }
      )
    }

    if (status !== 'going' && status !== 'maybe') {
      return NextResponse.json(
        { success: false, error: "status must be 'going' or 'maybe'" },
        { status: 400 }
      )
    }

    const { error: upsertError } = await supabase
      .from('crew_rsvps')
      .upsert(
        { crew_id: crewId, event_id, user_id: user.id, status },
        { onConflict: 'crew_id,event_id,user_id' }
      )

    if (upsertError) {
      console.error('RSVP upsert error:', upsertError)
      return NextResponse.json(
        { success: false, error: 'Failed to save RSVP' },
        { status: 500 }
      )
    }

    const { data: rsvps, error: countsError } = await supabase
      .from('crew_rsvps')
      .select('status')
      .eq('crew_id', crewId)
      .eq('event_id', event_id)

    if (countsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch RSVP counts' },
        { status: 500 }
      )
    }

    const counts = { going_count: 0, maybe_count: 0 }
    for (const r of rsvps ?? []) {
      if (r.status === 'going') counts.going_count += 1
      else if (r.status === 'maybe') counts.maybe_count += 1
    }

    return NextResponse.json({
      success: true,
      rsvp: { event_id, status },
      counts,
    })
  } catch (err) {
    console.error('POST /api/v1/crews/[id]/rsvps error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
