import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PitchFeedback } from '@/types/groups'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const supabase = await createClient()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { data: pitches, error: pitchesError } = await supabase
      .from('event_pitches')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (pitchesError) {
      console.error('Pitches fetch error:', pitchesError)
      return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 })
    }

    let userFeedback: Record<string, PitchFeedback> = {}

    const { data: { user } } = await supabase.auth.getUser()
    if (user && pitches && pitches.length > 0) {
      const pitchIds = pitches.map((p) => p.id)

      const { data: feedback, error: feedbackError } = await supabase
        .from('pitch_feedback')
        .select('*')
        .eq('member_id', user.id)
        .in('pitch_id', pitchIds)

      if (!feedbackError && feedback) {
        userFeedback = Object.fromEntries(feedback.map((f) => [f.pitch_id, f]))
      }
    }

    return NextResponse.json({ success: true, data: { pitches: pitches ?? [], userFeedback } })
  } catch (error: any) {
    console.error('Error fetching pitches:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch pitches' }, { status: 500 })
  }
}
