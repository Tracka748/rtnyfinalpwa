import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { format } from 'date-fns'

type HomepageEvent = {
  id: string
  title: string
  category: string
  image: string
  venue: string
  time: string
  price: string
  points: number
  date: string
  description: string
}

function getLowestPrice(ticketTypes: { price: number }[] | null | undefined): string {
  if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
    return 'TBA'
  }
  const prices = ticketTypes
    .map((t) => (typeof t?.price === 'number' ? t.price : null))
    .filter((p): p is number => p !== null)
  if (prices.length === 0) return 'TBA'
  const min = Math.min(...prices)
  if (min === 0) return 'Free'
  return `$${min}`
}

function mapRow(row: any): HomepageEvent {
  return {
    id: row.id,
    title: row.name,
    category: row.category,
    image: row.flyer_image_url ?? '',
    venue: row.venues?.name ?? '',
    time: row.event_date
      ? format(new Date(row.event_date), 'EEE • h:mm a')
      : '',
    price: getLowestPrice(row.ticket_types),
    points: 100,
    date: row.event_date,
    description: row.description ?? '',
  }
}

const CATEGORY_LIMITS: Record<string, number> = {
  nightlife: 8,
  family: 8,
  music: 8,
  movies: 6,
  dining: 6,
  arts: 6,
  sports: 6,
}

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const categories = Object.keys(CATEGORY_LIMITS) as string[]

    const results = await Promise.all(
      categories.map(async (category) => {
        const limit = CATEGORY_LIMITS[category]
        const { data, error } = await supabase
          .from('events')
          .select('id, name, category, event_date, flyer_image_url, description, ticket_prices, ticket_types(price), venues(name)')
          .eq('status', 'active')
          .eq('category', category)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(limit)

        if (error) {
          console.error(`Error fetching ${category} events:`, error)
          return { category, events: [] }
        }

        return { category, events: (data ?? []).map(mapRow) }
      })
    )

    const data = Object.fromEntries(results.map(({ category, events }) => [category, events]))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching homepage events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch homepage events' },
      { status: 500 }
    )
  }
}
