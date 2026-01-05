// app/api/v1/events/featured/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Fetch featured events only
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .eq('featured', true)
      .order('event_date', { ascending: true })
      .limit(10)

    if (eventsError) {
      console.error('Database error:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch featured events' },
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
      data: eventsWithTickets
    })

  } catch (error) {
    console.error('Error fetching featured events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured events' },
      { status: 500 }
    )
  }
}