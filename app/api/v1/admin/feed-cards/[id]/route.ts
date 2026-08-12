import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CARD_TYPES = ['announcement', 'curated', 'deal', 'featured']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid feed card id' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.type !== undefined) {
      if (typeof body.type !== 'string' || !CARD_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: `type must be one of: ${CARD_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      updates.type = body.type
    }
    if (body.headline !== undefined) {
      if (typeof body.headline !== 'string' || !body.headline.trim()) {
        return NextResponse.json({ error: 'headline must be a non-empty string' }, { status: 400 })
      }
      updates.headline = body.headline
    }
    if (body.sub !== undefined) updates.sub = body.sub
    if (body.action_label !== undefined) updates.action_label = body.action_label
    if (body.cta_url !== undefined) updates.cta_url = body.cta_url
    if (body.event_id !== undefined) updates.event_id = body.event_id
    if (body.promo_code !== undefined) updates.promo_code = body.promo_code
    if (body.image_url !== undefined) updates.image_url = body.image_url
    if (body.active !== undefined) updates.active = body.active
    if (body.starts_at !== undefined) updates.starts_at = body.starts_at
    if (body.ends_at !== undefined) updates.ends_at = body.ends_at
    if (body.display_order !== undefined) {
      if (!Number.isInteger(body.display_order)) {
        return NextResponse.json({ error: 'display_order must be an integer' }, { status: 400 })
      }
      updates.display_order = body.display_order
    }

    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('feed_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('admin/feed-cards/[id] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update feed card' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('admin/feed-cards/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update feed card' }, { status: 500 })
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
      return NextResponse.json({ error: 'Invalid feed card id' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { error } = await supabase.from('feed_cards').delete().eq('id', id)

    if (error) {
      console.error('admin/feed-cards/[id] DELETE error:', error)
      return NextResponse.json({ error: 'Failed to delete feed card' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin/feed-cards/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete feed card' }, { status: 500 })
  }
}
