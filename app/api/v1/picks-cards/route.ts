import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()

    const [cardsResult, optionsResult, { user }] = await Promise.all([
      supabase
        .from('picks_cards')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('display_order', { ascending: true }),
      supabase
        .from('picks_card_options')
        .select('*')
        .order('option_order', { ascending: true }),
      getCurrentUser(),
    ])

    if (cardsResult.error) {
      console.error('picks-cards GET cards query error:', cardsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch picks cards', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    if (optionsResult.error) {
      console.error('picks-cards GET options query error:', optionsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch picks cards', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    const cards = cardsResult.data ?? []

    const optionsByCard = new Map<string, typeof optionsResult.data>()
    for (const option of optionsResult.data ?? []) {
      const list = optionsByCard.get(option.card_id) ?? []
      list.push(option)
      optionsByCard.set(option.card_id, list)
    }

    let votesByCard = new Map<string, string>()
    if (user) {
      const { data: votes, error: votesError } = await supabase
        .from('picks_card_votes')
        .select('card_id, option_id')
        .eq('user_id', user.id)
        .in('card_id', cards.map((card) => card.id))

      if (votesError) {
        console.error('picks-cards GET votes query error:', votesError)
        return NextResponse.json(
          { error: 'Failed to fetch picks cards', code: 'DB_ERROR' },
          { status: 500 }
        )
      }

      votesByCard = new Map((votes ?? []).map((vote) => [vote.card_id, vote.option_id]))
    }

    const data = cards.map((card) => ({
      ...card,
      picks_card_options: optionsByCard.get(card.id) ?? [],
      user_vote_option_id: card.mode === 'survey' ? votesByCard.get(card.id) ?? null : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('picks-cards GET error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}
