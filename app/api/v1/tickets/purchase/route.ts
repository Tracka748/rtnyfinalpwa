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

    // Fetch ticket types
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)

    if (ticketTypesError || !ticketTypes) {
      return NextResponse.json(
        { error: 'Failed to fetch ticket types' },
        { status: 500 }
      )
    }

    // Create ticket records and track what needs to be decremented
    // FIX: Properly accumulate quantities for same ticket type
    const ticketRecords = []
    const ticketTypeUpdates: Record<string, number> = {}
    
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

      // Check availability
      const currentRemaining = Number(ticketType.remaining)
      const requestedQuantity = Number(ticket.quantity)
      
      if (currentRemaining < requestedQuantity) {
        return NextResponse.json(
          { error: `Only ${currentRemaining} ${ticketType.name} tickets remaining` },
          { status: 400 }
        )
      }

      // FIX: Accumulate quantities instead of overwriting
      if (ticketTypeUpdates[ticketType.id]) {
        ticketTypeUpdates[ticketType.id] += requestedQuantity
      } else {
        ticketTypeUpdates[ticketType.id] = requestedQuantity
      }

      // Create one record per ticket quantity
      for (let i = 0; i < requestedQuantity; i++) {
        // Generate unique ticket number
        const ticketNumber = `${eventId.substring(0, 8)}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
        
        ticketRecords.push({
          event_id: eventId,
          ticket_type: ticketType.name,
          ticket_number: ticketNumber,
          base_price: parseFloat(ticketType.price),
          purchase_price: parseFloat(ticketType.price),
          purchased_by: user.id,
          purchase_date: new Date().toISOString(),
          status: 'purchased',
          description: ticketType.description || null
        })
      }
    }

    // Insert all tickets
    const { data: insertedTickets, error: insertError } = await supabase
      .from('tickets')
      .insert(ticketRecords)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to create tickets',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      )
    }

    console.log(`✅ Created ${insertedTickets.length} tickets`)

    // FIX: Update remaining counts with proper number coercion and logging
    for (const [ticketTypeId, quantityToDecrement] of Object.entries(ticketTypeUpdates)) {
      const ticketType = ticketTypes.find((t: any) => t.id === ticketTypeId)
      
      if (!ticketType) {
        console.error(`⚠️ Ticket type ${ticketTypeId} not found for update`)
        continue
      }

      const currentRemaining = Number(ticketType.remaining)
      const newRemaining = currentRemaining - Number(quantityToDecrement)

      console.log(`📊 Updating ${ticketType.name}: ${currentRemaining} → ${newRemaining}`)
      
      const { data: updateData, error: updateError } = await supabase
        .from('ticket_types')
        .update({ 
          remaining: newRemaining,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketTypeId)
        .select()

      if (updateError) {
        console.error('❌ Failed to update remaining count:', {
          ticketTypeId,
          ticketTypeName: ticketType.name,
          error: updateError.message,
          details: updateError.details,
          code: updateError.code
        })
      } else {
        console.log(`✅ Updated ${ticketType.name} remaining count:`, updateData)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ticketCount: insertedTickets.length,
        tickets: insertedTickets
      }
    })

  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to complete purchase' },
      { status: 500 }
    )
  }
}