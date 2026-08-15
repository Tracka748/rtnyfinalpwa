import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid picks card id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const optionId = body?.option_id

    if (typeof optionId !== 'string' || !UUID_REGEX.test(optionId)) {
      return NextResponse.json(
        { error: 'option_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    const { data: card, error: cardError } = await supabase
      .from('picks_cards')
      .select('*')
      .eq('id', id)
      .single()

    if (cardError || !card) {
      return NextResponse.json(
        { error: 'Picks card not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (!card.is_active) {
      return NextResponse.json(
        { error: 'This picks card is not active', code: 'CARD_INACTIVE' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (
      (card.start_date && new Date(card.start_date) > now) ||
      (card.end_date && new Date(card.end_date) < now)
    ) {
      return NextResponse.json(
        { error: 'This picks card is not currently open for voting', code: 'CARD_CLOSED' },
        { status: 400 }
      )
    }

    if (card.mode !== 'survey') {
      return NextResponse.json(
        { error: 'This picks card is not voteable', code: 'NOT_VOTEABLE' },
        { status: 400 }
      )
    }

    const { data: option, error: optionError } = await supabase
      .from('picks_card_options')
      .select('*')
      .eq('id', optionId)
      .eq('card_id', id)
      .single()

    if (optionError || !option) {
      return NextResponse.json(
        { error: 'option_id does not belong to this picks card', code: 'INVALID_OPTION' },
        { status: 400 }
      )
    }

    const { error: voteError } = await supabase
      .from('picks_card_votes')
      .insert({ card_id: id, option_id: optionId, user_id: user.id })

    if (voteError) {
      if (voteError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted on this picks card', code: 'ALREADY_VOTED' },
          { status: 409 }
        )
      }
      console.error('picks-cards/[id]/vote insert error:', voteError)
      return NextResponse.json(
        { error: 'Failed to record vote', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    const { data: voteCount, error: incrementError } = await supabase.rpc(
      'increment_picks_card_option_vote',
      { p_option_id: optionId }
    )

    if (incrementError) {
      console.error('picks-cards/[id]/vote increment error:', incrementError)
      return NextResponse.json(
        { error: 'Vote recorded but failed to update vote count', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { option_id: optionId, vote_count: voteCount },
    })
  } catch (err) {
    console.error('picks-cards/[id]/vote POST error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}
