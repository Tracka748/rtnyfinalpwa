import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('AUTH DEBUG:', JSON.stringify({ user: user?.id, authError }))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventId, items, promoCode, boosters, crewId } = body

    // Validate required fields
    if (!eventId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If a crew was selected, re-verify server-side that the buyer is actually
    // an active member — never trust the crewId value sent by the client.
    let verifiedCrewId: string | null = null
    if (crewId) {
      const { data: membership } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('crew_id', crewId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership) {
        verifiedCrewId = crewId
      } else {
        console.warn(`Ignoring crewId ${crewId} — user ${user.id} is not an active member`)
      }
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, venues(*)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch ticket types to validate prices
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId)

    if (ticketTypesError || !ticketTypes) {
      return NextResponse.json({ error: 'Ticket types not found' }, { status: 404 })
    }

    // Create line items for Stripe (tickets)
    const lineItems = items.map((item: any) => {
      const ticketType = ticketTypes.find((tt: any) => tt.id === item.ticketTypeId)
      if (!ticketType) {
        throw new Error(`Ticket type ${item.ticketTypeId} not found`)
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.name} - ${ticketType.name}`,
            description: `${item.quantity}x ${ticketType.name} ticket(s)`,
            images: event.flyer_image_url ? [event.flyer_image_url] : [],
          },
          unit_amount: Math.round(ticketType.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      }
    })

    // Add boosters to line items if any
    if (boosters && boosters.length > 0) {
      boosters.forEach((booster: any) => {
        if (booster && booster.name && booster.price) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${booster.name} (Add-on)`,
                description: 'Event booster',
              },
              unit_amount: Math.round(booster.price * 100),
            },
            quantity: 1,
          })
        }
      })
    }

    // Build enriched items for metadata — include name and price so the
    // webhook can insert tickets without needing a second DB lookup
    const enrichedItems = items.map((item: any) => {
      const ticketType = ticketTypes.find((tt: any) => tt.id === item.ticketTypeId)
      return {
        ticketTypeId: item.ticketTypeId,
        name: ticketType?.name || 'General Admission',
        price: ticketType?.price ?? 0,
        quantity: item.quantity,
      }
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        eventId: eventId,
        items: JSON.stringify(enrichedItems),
        promoCode: promoCode || '',
        boosters: boosters ? JSON.stringify(boosters) : '',
        crewId: verifiedCrewId || '',
      },
    })

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    })
  } catch (error: any) {
    console.error('Stripe session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}