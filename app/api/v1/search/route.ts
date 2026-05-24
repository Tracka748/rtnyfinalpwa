import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: { events: [], venues: [], artists: [] } })
  }

  try {
    const supabase = await createClient()
    const pattern = `%${q}%`

    const [eventsResult, venuesResult, artistsResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, category, event_date, flyer_image_url')
        .ilike('name', pattern)
        .eq('status', 'active')
        .limit(4),
      supabase
        .from('venues')
        .select('id, name, address')
        .ilike('name', pattern)
        .limit(4),
      supabase
        .from('artists')
        .select('id, name, genre, photo_url, slug')
        .ilike('name', pattern)
        .limit(4),
    ])

    if (eventsResult.error) console.error('Events query error:', eventsResult.error)
    if (venuesResult.error) console.error('Venues query error:', venuesResult.error)
    if (artistsResult.error) console.error('Artists query error:', artistsResult.error)

    if (eventsResult.error) throw eventsResult.error
    if (venuesResult.error) throw venuesResult.error
    if (artistsResult.error) throw artistsResult.error

    return NextResponse.json({
      success: true,
      data: {
        events: eventsResult.data ?? [],
        venues: venuesResult.data ?? [],
        artists: artistsResult.data ?? [],
      },
    })
  } catch (error) {
    console.error('Search route threw:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
