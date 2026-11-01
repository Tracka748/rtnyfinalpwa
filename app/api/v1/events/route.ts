// app/api/v1/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getEventDateStr,
  getEventDayWindow,
  isValidDateStr,
  notEndedOrFilter,
} from '@/lib/event-time'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  try {
    const supabase = await createClient()

    let query = supabase
      .from('events')
      .select(`
        *,
        venues!inner (
          name,
          address
        ),
        ticket_types (*)
      `)
      .eq('status', 'active')

    // Filter by date: the day window is computed in America/New_York.
    if (date) {
      if (!isValidDateStr(date)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      }
      const now = new Date()
      const { startIso, endIso } = getEventDayWindow(date)
      query = query.gte('event_date', startIso).lt('event_date', endIso)

      // Today only: hide events that have already ended.
      if (date === getEventDateStr(now)) {
        query = query.or(notEndedOrFilter(now))
      }
    }

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    query = query.order('event_date', { ascending: true })

    // Search by name or description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      console.error('Database error:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Attach venue info to each event (ticket_types already joined)
    const eventsWithData = (events || []).map(event => ({
      ...event,
      venue_name: event.venues?.name || null,
      venue_address: event.venues?.address || null,
    }))

    return NextResponse.json({
      success: true,
      data: eventsWithData,
      events: eventsWithData
    })

  } catch (error: any) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
