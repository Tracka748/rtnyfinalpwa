import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pitchId } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      interest_level,
      thumbs_vote,
      preferred_dates,
      preferred_location,
      price_acceptable,
      price_range_min,
      price_range_max,
      additional_comments,
      action_commitment,
    } = body

    if (!interest_level) {
      return NextResponse.json({ error: 'interest_level is required' }, { status: 400 })
    }

    const validInterestLevels = ['very_interested', 'somewhat_interested', 'not_interested']
    if (!validInterestLevels.includes(interest_level)) {
      return NextResponse.json({ error: 'Invalid interest_level' }, { status: 400 })
    }

    const { data: pitch, error: pitchError } = await supabase
      .from('event_pitches')
      .select('id')
      .eq('id', pitchId)
      .eq('status', 'active')
      .single()

    if (pitchError || !pitch) {
      return NextResponse.json({ error: 'Pitch not found or closed' }, { status: 404 })
    }

    const payload = {
      pitch_id: pitchId,
      member_id: user.id,
      interest_level,
      thumbs_vote: thumbs_vote ?? null,
      preferred_dates: preferred_dates ?? [],
      preferred_location: preferred_location ?? null,
      price_acceptable: price_acceptable ?? null,
      price_range_min: price_range_min ?? null,
      price_range_max: price_range_max ?? null,
      additional_comments: additional_comments ?? null,
      action_commitment: action_commitment ?? null,
      submitted_at: new Date().toISOString(),
    }

    const { data: feedback, error: upsertError } = await supabase
      .from('pitch_feedback')
      .upsert(payload, { onConflict: 'pitch_id,member_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Feedback upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: feedback })
  } catch (error: any) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 })
  }
}
