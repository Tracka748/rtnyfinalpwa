import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const CARD_TYPES = ['vs', 'list3']
const MODES = ['survey', 'promo']
const OPTION_COUNTS: Record<string, number> = { vs: 2, list3: 3 }

export async function GET() {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const supabase = createSupabaseAdmin()

    const [cardsResult, optionsResult] = await Promise.all([
      supabase.from('picks_cards').select('*').order('display_order', { ascending: true }),
      supabase.from('picks_card_options').select('*').order('option_order', { ascending: true }),
    ])

    if (cardsResult.error) {
      console.error('admin/picks-cards GET cards query error:', cardsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch picks cards', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    if (optionsResult.error) {
      console.error('admin/picks-cards GET options query error:', optionsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch picks cards', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    const optionsByCard = new Map<string, typeof optionsResult.data>()
    for (const option of optionsResult.data ?? []) {
      const list = optionsByCard.get(option.card_id) ?? []
      list.push(option)
      optionsByCard.set(option.card_id, list)
    }

    const data = (cardsResult.data ?? []).map((card) => ({
      ...card,
      picks_card_options: optionsByCard.get(card.id) ?? [],
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('admin/picks-cards GET error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const body = await request.json()
    const {
      card_type, mode, title, background_color, categories, display_order, is_active,
      start_date, end_date, options,
    } = body

    if (typeof card_type !== 'string' || !CARD_TYPES.includes(card_type)) {
      return NextResponse.json(
        { error: `card_type must be one of: ${CARD_TYPES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (typeof mode !== 'string' || !MODES.includes(mode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${MODES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'title is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (background_color !== undefined && background_color !== null && typeof background_color !== 'string') {
      return NextResponse.json(
        { error: 'background_color must be a string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (categories !== undefined && (!Array.isArray(categories) || !categories.every((c) => typeof c === 'string'))) {
      return NextResponse.json(
        { error: 'categories must be an array of strings', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (display_order !== undefined && !Number.isInteger(display_order)) {
      return NextResponse.json(
        { error: 'display_order must be an integer', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (start_date !== undefined && start_date !== null && typeof start_date !== 'string') {
      return NextResponse.json(
        { error: 'start_date must be a string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    if (end_date !== undefined && end_date !== null && typeof end_date !== 'string') {
      return NextResponse.json(
        { error: 'end_date must be a string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const expectedOptionCount = OPTION_COUNTS[card_type]
    if (!Array.isArray(options) || options.length !== expectedOptionCount) {
      return NextResponse.json(
        {
          error: `options must be an array of ${expectedOptionCount} items for card_type "${card_type}"`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }
    for (const option of options) {
      if (typeof option?.label !== 'string' || !option.label.trim()) {
        return NextResponse.json(
          { error: 'each option requires a non-empty label', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      if (option.link_url !== undefined && option.link_url !== null && typeof option.link_url !== 'string') {
        return NextResponse.json(
          { error: 'option link_url must be a string', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    const insert: Record<string, unknown> = { card_type, mode, title }
    if (background_color !== undefined) insert.background_color = background_color
    if (categories !== undefined) insert.categories = categories
    if (display_order !== undefined) insert.display_order = display_order
    if (is_active !== undefined) insert.is_active = is_active
    if (start_date !== undefined) insert.start_date = start_date
    if (end_date !== undefined) insert.end_date = end_date

    const supabase = createSupabaseAdmin()

    const { data: card, error: cardError } = await supabase
      .from('picks_cards')
      .insert(insert)
      .select()
      .single()

    if (cardError) {
      console.error('admin/picks-cards POST card insert error:', cardError)
      return NextResponse.json(
        { error: 'Failed to create picks card', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    const optionsInsert = options.map((option, index) => ({
      card_id: card.id,
      label: option.label,
      link_url: option.link_url ?? null,
      option_order: index + 1,
    }))

    const { data: insertedOptions, error: optionsError } = await supabase
      .from('picks_card_options')
      .insert(optionsInsert)
      .select()
      .order('option_order', { ascending: true })

    if (optionsError) {
      console.error('admin/picks-cards POST options insert error, rolling back card:', optionsError)
      const { error: rollbackError } = await supabase.from('picks_cards').delete().eq('id', card.id)
      if (rollbackError) {
        console.error('admin/picks-cards POST failed to roll back card after options failure:', rollbackError)
      }
      return NextResponse.json(
        { error: 'Failed to create picks card options', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...card, picks_card_options: insertedOptions ?? [] },
    })
  } catch (err) {
    console.error('admin/picks-cards POST error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}
