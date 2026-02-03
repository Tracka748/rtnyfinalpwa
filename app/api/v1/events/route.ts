// app/api/v1/events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  try {
    const supabase = await createClient()

    let query = supabase
      .from('events')
      .select(`
        *,
        venues (
          name,
          address
        )
      `)
      .eq('status', 'active')
      .order('event_date', { ascending: true })

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

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

    // Attach ticket types and venue info to each event
    const eventsWithData = (events || []).map(event => ({
      ...event,
      ticket_types: ticketTypesByEvent[event.id] || [],
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
