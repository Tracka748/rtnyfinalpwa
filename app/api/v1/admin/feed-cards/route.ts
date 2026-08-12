import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

const CARD_TYPES = ['announcement', 'curated', 'deal', 'featured']

export async function GET() {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('feed_cards')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('admin/feed-cards GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('admin/feed-cards GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const body = await request.json()
    const {
      type, headline, sub, action_label, cta_url, event_id, promo_code, image_url,
      active, starts_at, ends_at, display_order, created_by,
    } = body

    if (typeof type !== 'string' || !CARD_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${CARD_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (typeof headline !== 'string' || !headline.trim()) {
      return NextResponse.json({ error: 'headline is required' }, { status: 400 })
    }
    if (display_order !== undefined && !Number.isInteger(display_order)) {
      return NextResponse.json({ error: 'display_order must be an integer' }, { status: 400 })
    }

    const insert: Record<string, unknown> = { type, headline }
    if (sub !== undefined) insert.sub = sub
    if (action_label !== undefined) insert.action_label = action_label
    if (cta_url !== undefined) insert.cta_url = cta_url
    if (event_id !== undefined) insert.event_id = event_id
    if (promo_code !== undefined) insert.promo_code = promo_code
    if (image_url !== undefined) insert.image_url = image_url
    if (active !== undefined) insert.active = active
    if (starts_at !== undefined) insert.starts_at = starts_at
    if (ends_at !== undefined) insert.ends_at = ends_at
    if (display_order !== undefined) insert.display_order = display_order
    if (created_by !== undefined) insert.created_by = created_by

    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('feed_cards')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('admin/feed-cards POST insert error:', error)
      return NextResponse.json({ error: 'Failed to create feed card' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('admin/feed-cards POST error:', err)
    return NextResponse.json({ error: 'Failed to create feed card' }, { status: 500 })
  }
}
