import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { eventId, tickets } = body

    // Validate input
    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch ticket types for this event from ticket_types table
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)

    if (ticketTypesError || !ticketTypes || ticketTypes.length === 0) {
      return NextResponse.json(
        { error: 'No ticket types found for this event' },
        { status: 404 }
      )
    }

    // Validate each ticket type exists and calculate total
    let totalAmount = 0
    const validatedTickets = []

    for (const ticket of tickets) {
      const ticketType = ticketTypes.find(
        (t: any) => t.id === ticket.ticketTypeId
      )

      if (!ticketType) {
        return NextResponse.json(
          { error: `Invalid ticket type: ${ticket.ticketTypeId}` },
          { status: 400 }
        )
      }

      if (ticket.quantity < 1) {
        return NextResponse.json(
          { error: 'Quantity must be at least 1' },
          { status: 400 }
        )
      }

      // Check availability
      if (ticketType.remaining < ticket.quantity) {
        return NextResponse.json(
          { error: `Only ${ticketType.remaining} ${ticketType.name} tickets remaining` },
          { status: 400 }
        )
      }

      const subtotal = parseFloat(ticketType.price) * ticket.quantity
      totalAmount += subtotal

      validatedTickets.push({
        ticketTypeId: ticket.ticketTypeId,
        name: ticketType.name,
        price: parseFloat(ticketType.price),
        quantity: ticket.quantity,
        subtotal
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name
        },
        tickets: validatedTickets,
        totalAmount
      }
    })

  } catch (error) {
    console.error('Ticket validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate tickets' },
      { status: 500 }
    )
  }
}