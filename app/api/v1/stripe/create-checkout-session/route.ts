import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Per-order ceiling when the event has no max_tickets_per_user
const DEFAULT_ORDER_LIMIT = 10
// Stripe rejects metadata values longer than 500 characters
const STRIPE_METADATA_VALUE_LIMIT = 500

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status })
}

export async function POST(req: NextRequest) {
  try {
    // Cookie client is used only to identify the caller; all data access uses the admin client
    const authClient = await createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return fail(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const supabase = createSupabaseAdmin()

    const body = await req.json()
    const { eventId, items, crewId } = body ?? {}

    if (Array.isArray(body?.boosters) && body.boosters.length > 0) {
      return fail(400, 'BOOSTERS_NOT_AVAILABLE', 'Add-ons are not available')
    }

    // Validate required fields
    if (!eventId || typeof eventId !== 'string') {
      return fail(400, 'MISSING_FIELDS', 'Missing required fields')
    }

    if (!Array.isArray(items) || items.length === 0) {
      return fail(400, 'INVALID_ITEMS', 'Add at least one ticket to your order')
    }

    // Validate each line, then merge duplicate ticketTypeId lines by summing quantity.
    // Prices and names sent by the client are ignored entirely.
    const mergedQuantities = new Map<string, number>()
    for (const item of items) {
      const ticketTypeId = item?.ticketTypeId
      const quantity = item?.quantity
      if (
        typeof ticketTypeId !== 'string' ||
        !ticketTypeId ||
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return fail(400, 'INVALID_ITEMS', 'Each ticket needs a valid type and a whole-number quantity of at least 1')
      }
      mergedQuantities.set(ticketTypeId, (mergedQuantities.get(ticketTypeId) ?? 0) + quantity)
    }
    const mergedLines = Array.from(mergedQuantities, ([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
    const totalRequested = mergedLines.reduce((sum, line) => sum + line.quantity, 0)

    // If a crew was selected, re-verify server-side that the buyer is actually
    // an active member — never trust the crewId value sent by the client.
    let verifiedCrewId: string | null = null
    if (crewId && typeof crewId === 'string') {
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

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, event_date, event_end_date, sale_start_date, sale_end_date, max_tickets_per_user, flyer_image_url')
      .eq('id', eventId)
      .maybeSingle()

    if (eventError) {
      console.error('Checkout event lookup error:', eventError)
      return fail(500, 'INTERNAL_ERROR', 'Failed to create checkout session')
    }

    if (!event) {
      return fail(404, 'EVENT_NOT_FOUND', 'Event not found')
    }

    if (event.status !== 'active') {
      return fail(409, 'EVENT_NOT_ACTIVE', 'This event is not currently on sale')
    }

    // Sale window — server time only
    const now = Date.now()
    const eventStartMs = new Date(event.event_date).getTime()
    const eventEndMs = new Date(event.event_end_date ?? event.event_date).getTime()
    if (!Number.isFinite(eventStartMs) || !Number.isFinite(eventEndMs)) {
      console.error('Checkout: event has an unparseable date', event.id, event.event_date, event.event_end_date)
      return fail(409, 'SALES_CLOSED', 'Ticket sales for this event are closed')
    }

    if (event.sale_start_date) {
      const saleStartMs = new Date(event.sale_start_date).getTime()
      if (Number.isFinite(saleStartMs) && now < saleStartMs) {
        return fail(409, 'SALES_NOT_STARTED', 'Ticket sales for this event have not started yet')
      }
    }

    const saleEndMs = event.sale_end_date ? new Date(event.sale_end_date).getTime() : NaN
    const closeMs = Number.isFinite(saleEndMs) ? saleEndMs : eventEndMs
    if (now >= closeMs || now >= eventEndMs) {
      return fail(409, 'SALES_CLOSED', 'Ticket sales for this event are closed')
    }

    // Fetch the requested ticket types — they must all belong to this event
    const { data: ticketTypes, error: ticketTypesError } = await supabase
      .from('ticket_types')
      .select('id, name, price, remaining')
      .eq('event_id', eventId)
      .in('id', mergedLines.map((line) => line.ticketTypeId))

    if (ticketTypesError) {
      console.error('Checkout ticket types lookup error:', ticketTypesError)
      return fail(500, 'INTERNAL_ERROR', 'Failed to create checkout session')
    }

    const ticketTypeById = new Map<string, any>((ticketTypes ?? []).map((tt: any) => [tt.id, tt]))
    if (mergedLines.some((line) => !ticketTypeById.has(line.ticketTypeId))) {
      return fail(400, 'TICKET_TYPE_NOT_FOUND', 'One or more ticket types are not available for this event')
    }

    // Soft inventory check (the webhook's transactional decrement is the real guard)
    for (const line of mergedLines) {
      const tt = ticketTypeById.get(line.ticketTypeId)
      const remaining = Number(tt.remaining)
      if (!(remaining > 0)) {
        return fail(409, 'SOLD_OUT', `${tt.name} is sold out`)
      }
      if (remaining < line.quantity) {
        return fail(
          409,
          'INSUFFICIENT_INVENTORY',
          `Only ${remaining} ${tt.name} ticket${remaining === 1 ? '' : 's'} remaining`
        )
      }
    }

    // Quantity caps
    const maxPerUser: number | null = event.max_tickets_per_user
    if (maxPerUser !== null && maxPerUser !== undefined) {
      // Lifetime cap per user per event
      const { count, error: countError } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('purchased_by', user.id)
        .eq('event_id', eventId)
        .in('status', ['purchased', 'used'])

      if (countError) {
        console.error('Checkout existing ticket count error:', countError)
        return fail(500, 'INTERNAL_ERROR', 'Failed to create checkout session')
      }

      const existing = count ?? 0
      if (existing + totalRequested > maxPerUser) {
        const canStillBuy = Math.max(maxPerUser - existing, 0)
        return fail(
          409,
          'TICKET_LIMIT_EXCEEDED',
          canStillBuy === 0
            ? `You have already reached the limit of ${maxPerUser} ticket${maxPerUser === 1 ? '' : 's'} for this event`
            : `The limit is ${maxPerUser} ticket${maxPerUser === 1 ? '' : 's'} per person for this event — you can buy ${canStillBuy} more`
        )
      }
    } else if (totalRequested > DEFAULT_ORDER_LIMIT) {
      return fail(400, 'ORDER_LIMIT_EXCEEDED', `You can buy up to ${DEFAULT_ORDER_LIMIT} tickets per order`)
    }

    // Build everything from DB rows. Free tickets are not supported by this flow.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const enrichedItems: { ticketTypeId: string; name: string; price: number; quantity: number }[] = []
    let expectedTotalCents = 0

    for (const line of mergedLines) {
      const tt = ticketTypeById.get(line.ticketTypeId)
      const price = Number(tt.price)
      const unitAmount = Math.round(price * 100)

      if (!Number.isFinite(price) || price <= 0 || unitAmount <= 0) {
        return fail(400, 'FREE_NOT_SUPPORTED', 'Free tickets cannot be purchased through checkout')
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.name} - ${tt.name}`,
            description: `${line.quantity}x ${tt.name} ticket(s)`,
            images: event.flyer_image_url ? [event.flyer_image_url] : [],
          },
          unit_amount: unitAmount,
        },
        quantity: line.quantity,
      })

      enrichedItems.push({
        ticketTypeId: line.ticketTypeId,
        name: tt.name || 'General Admission',
        price,
        quantity: line.quantity,
      })

      expectedTotalCents += unitAmount * line.quantity
    }

    const itemsMetadata = JSON.stringify(enrichedItems)
    if (itemsMetadata.length > STRIPE_METADATA_VALUE_LIMIT) {
      return fail(400, 'ORDER_TOO_LARGE', 'This order has too many different ticket types — split it into separate orders')
    }

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
        items: itemsMetadata,
        crewId: verifiedCrewId || '',
        expectedTotalCents: String(expectedTotalCents),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: unknown) {
    // Real error is logged server-side only
    console.error('Stripe session error:', error)
    return fail(500, 'INTERNAL_ERROR', 'Failed to create checkout session')
  }
}
