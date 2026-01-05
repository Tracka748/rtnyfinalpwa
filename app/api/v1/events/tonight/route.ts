// app/api/v1/events/tonight/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get today's date range
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    // Fetch events happening today
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gte('event_date', startOfToday.toISOString())
      .lte('event_date', endOfToday.toISOString())
      .order('event_date', { ascending: true })

    if (eventsError) {
      console.error('Database error:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch tonight events' },
        { status: 500 }
      )
    }

    // Fetch ticket types for all events
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')

    if (ticketTypesError) {
      console.error('Ticket types error:', ticketTypesError)
    }

    // Group ticket types by event_id
    const ticketTypesByEvent = (ticketTypes || []).reduce((acc, ticket) => {
      if (!acc[ticket.event_id]) {
        acc[ticket.event_id] = []
      }
      acc[ticket.event_id].push(ticket)
      return acc
    }, {} as Record<string, any[]>)

    // Attach ticket types to each event
    const eventsWithTickets = events.map(event => ({
      ...event,
      ticket_types: ticketTypesByEvent[event.id] || []
    }))

    return NextResponse.json({
      success: true,
      data: eventsWithTickets,
      message: eventsWithTickets.length === 0 ? 'No events scheduled for tonight' : undefined
    })

  } catch (error) {
    console.error('Error fetching tonight events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tonight events' },
      { status: 500 }
    )
  }
}