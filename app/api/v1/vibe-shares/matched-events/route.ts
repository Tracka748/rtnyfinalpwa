import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// Maps a vibe tag slug to the event categories it should surface matches from.
// Several vibes fan out into multiple categories (e.g. 'with-the-crew'); several
// categories are reachable from multiple vibes (nightlife especially) — dedup
// happens after all selected tags are resolved, not here.
const VIBE_CATEGORY_MAP: Record<string, string[]> = {
  'hip-hop': ['nightlife'],
  'reggae-dancehall': ['nightlife'],
  'latin-vibes': ['nightlife'],
  'live-music': ['nightlife'],
  'r-and-b': ['nightlife'],
  'afrobeats': ['nightlife'],
  'local-music-junkie': ['nightlife'],
  'dancing': ['nightlife'],
  'high-energy': ['nightlife'],
  'with-the-crew': ['nightlife', 'dining', 'arts'],
  'chill': ['dining'],
  'date-night': ['dining'],
  'foodie': ['dining'],
  'something-different': ['arts'],
  'solo-explorer': ['arts'],
  'lgbtq': ['arts'],
  'sports-fan': ['sports'],
  'family-friendly': ['family'],
  'edm-house': ['nightlife'],
  'arts-culture': ['arts'],
}

const MAX_EVENTS = 4

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam
      ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const categories = [...new Set(tags.flatMap((tag) => VIBE_CATEGORY_MAP[tag] ?? []))]

    // No tags, or none map to a known category — nothing to match, not an error.
    if (categories.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const supabase = createSupabaseAdmin()

    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, category, event_date, flyer_image_url, venues (name)')
      .eq('status', 'active')
      .in('category', categories)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(MAX_EVENTS)

    if (error) {
      console.error('vibe-shares matched-events query error:', error)
      return NextResponse.json({ error: 'Failed to load matched events' }, { status: 500 })
    }

    const result = (events ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      category: event.category,
      event_date: event.event_date,
      venue_name: event.venues?.[0]?.name ?? null,
      flyer_image_url: event.flyer_image_url,
    }))

    return NextResponse.json({ events: result })
  } catch (err) {
    console.error('vibe-shares matched-events route error:', err)
    return NextResponse.json({ error: 'Failed to load matched events' }, { status: 500 })
  }
}
