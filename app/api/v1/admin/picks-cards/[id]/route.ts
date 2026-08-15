import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MODES = ['survey', 'promo']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid picks card id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (body.card_type !== undefined) {
      return NextResponse.json(
        { error: 'card_type cannot be changed after creation', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}

    if (body.mode !== undefined) {
      if (typeof body.mode !== 'string' || !MODES.includes(body.mode)) {
        return NextResponse.json(
          { error: `mode must be one of: ${MODES.join(', ')}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.mode = body.mode
    }
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return NextResponse.json(
          { error: 'title must be a non-empty string', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.title = body.title
    }
    if (body.background_color !== undefined) {
      if (body.background_color !== null && typeof body.background_color !== 'string') {
        return NextResponse.json(
          { error: 'background_color must be a string', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.background_color = body.background_color
    }
    if (body.categories !== undefined) {
      if (!Array.isArray(body.categories) || !body.categories.every((c: unknown) => typeof c === 'string')) {
        return NextResponse.json(
          { error: 'categories must be an array of strings', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.categories = body.categories
    }
    if (body.display_order !== undefined) {
      if (!Number.isInteger(body.display_order)) {
        return NextResponse.json(
          { error: 'display_order must be an integer', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.display_order = body.display_order
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active must be a boolean', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.is_active = body.is_active
    }
    if (body.start_date !== undefined) {
      if (body.start_date !== null && typeof body.start_date !== 'string') {
        return NextResponse.json(
          { error: 'start_date must be a string', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.start_date = body.start_date
    }
    if (body.end_date !== undefined) {
      if (body.end_date !== null && typeof body.end_date !== 'string') {
        return NextResponse.json(
          { error: 'end_date must be a string', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updates.end_date = body.end_date
    }

    let options: Array<{ id: string; label?: string; link_url?: string | null }> | undefined
    if (body.options !== undefined) {
      if (!Array.isArray(body.options)) {
        return NextResponse.json(
          { error: 'options must be an array', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      for (const option of body.options) {
        if (typeof option?.id !== 'string' || !UUID_REGEX.test(option.id)) {
          return NextResponse.json(
            { error: 'each option requires a valid id', code: 'VALIDATION_ERROR' },
            { status: 400 }
          )
        }
        if (option.option_order !== undefined) {
          return NextResponse.json(
            { error: 'option_order cannot be changed after creation', code: 'VALIDATION_ERROR' },
            { status: 400 }
          )
        }
        if (option.label !== undefined && (typeof option.label !== 'string' || !option.label.trim())) {
          return NextResponse.json(
            { error: 'option label must be a non-empty string', code: 'VALIDATION_ERROR' },
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
      options = body.options
    }

    const supabase = createSupabaseAdmin()

    if (Object.keys(updates).length > 0) {
      const { error: cardUpdateError } = await supabase
        .from('picks_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (cardUpdateError) {
        console.error('admin/picks-cards/[id] PATCH card update error:', cardUpdateError)
        return NextResponse.json(
          { error: 'Failed to update picks card', code: 'DB_ERROR' },
          { status: 500 }
        )
      }
    }

    if (options) {
      const results = await Promise.all(
        options.map((option) => {
          const optionUpdates: Record<string, unknown> = {}
          if (option.label !== undefined) optionUpdates.label = option.label
          if (option.link_url !== undefined) optionUpdates.link_url = option.link_url

          return supabase
            .from('picks_card_options')
            .update(optionUpdates)
            .eq('id', option.id)
            .eq('card_id', id)
        })
      )

      const optionError = results.find((result) => result.error)?.error
      if (optionError) {
        console.error('admin/picks-cards/[id] PATCH option update error:', optionError)
        return NextResponse.json(
          { error: 'Failed to update picks card options', code: 'DB_ERROR' },
          { status: 500 }
        )
      }
    }

    const [cardResult, optionsResult] = await Promise.all([
      supabase.from('picks_cards').select('*').eq('id', id).single(),
      supabase.from('picks_card_options').select('*').eq('card_id', id).order('option_order', { ascending: true }),
    ])

    if (cardResult.error) {
      console.error('admin/picks-cards/[id] PATCH fetch error:', cardResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch updated picks card', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...cardResult.data, picks_card_options: optionsResult.data ?? [] },
    })
  } catch (err) {
    console.error('admin/picks-cards/[id] PATCH error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid picks card id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    const { error } = await supabase.from('picks_cards').delete().eq('id', id)

    if (error) {
      console.error('admin/picks-cards/[id] DELETE error:', error)
      return NextResponse.json(
        { error: 'Failed to delete picks card', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch (err) {
    console.error('admin/picks-cards/[id] DELETE error:', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    )
  }
}
