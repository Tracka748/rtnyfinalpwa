import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('feed_cards')
      .select('id, type, headline, sub, action_label, cta_url, event_id, promo_code, image_url')
      .eq('active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true })
      .limit(8)

    if (error) {
      console.error('feed-cards GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('feed-cards GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
  }
}
