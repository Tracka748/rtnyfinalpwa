import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { option_id } = body as { option_id: string }

    if (!option_id) {
      return NextResponse.json({ error: 'option_id is required' }, { status: 400 })
    }

    // Fetch poll and check it exists / not closed
    const { data: poll, error: pollError } = await supabase
      .from('group_polls')
      .select('*')
      .eq('id', pollId)
      .single()

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('group_poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }

    // Verify option_id exists in poll options
    const options: Array<{ id: string; label: string; votes: number }> = poll.options || []
    const optionIndex = options.findIndex(o => o.id === option_id)
    if (optionIndex === -1) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }

    // Insert vote
    const { error: voteError } = await supabase
      .from('group_poll_votes')
      .insert({ poll_id: pollId, user_id: user.id, option_id })

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json({ error: 'Already voted' }, { status: 400 })
      }
      console.error('Vote error:', voteError)
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    // Increment vote count in JSONB options array
    const updatedOptions = options.map((o, i) =>
      i === optionIndex ? { ...o, votes: (o.votes || 0) + 1 } : o
    )

    const { data: updatedPoll, error: updateError } = await supabase
      .from('group_polls')
      .update({ options: updatedOptions })
      .eq('id', pollId)
      .select()
      .single()

    if (updateError) {
      console.error('Poll update error:', updateError)
      // Vote was recorded, return success even if count update failed
    }

    return NextResponse.json({
      success: true,
      data: { poll: updatedPoll || poll, user_vote: option_id },
    })
  } catch (error: any) {
    console.error('Error voting:', error)
    return NextResponse.json({ error: error.message || 'Failed to vote' }, { status: 500 })
  }
}
