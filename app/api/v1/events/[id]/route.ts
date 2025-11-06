import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      console.error('Event fetch error:', eventError)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch ticket types for this event from the ticket_types table
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', id)
      .order('price', { ascending: true })

    if (ticketTypesError) {
      console.error('Ticket types fetch error:', ticketTypesError)
      // Don't fail the whole request, just return empty ticket types
    }

    // Combine event with its ticket types
    const eventWithTickets = {
      ...event,
      ticket_types: ticketTypes || []
    }

    return NextResponse.json({
      success: true,
      data: eventWithTickets
    })

  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}