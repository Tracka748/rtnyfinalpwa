import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { randomBytes, randomUUID } from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

// CRITICAL: Disable body parsing for Stripe webhooks
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Unambiguous alphabet (no 0/O, 1/I/L): 31 chars.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

// Rejection sampling (accept bytes < 31*8) keeps the distribution unbiased.
function generateConfirmationCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length)
  let code = ''
  while (code.length < CODE_LENGTH) {
    for (const b of randomBytes(CODE_LENGTH * 2)) {
      if (b < limit && code.length < CODE_LENGTH) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
    }
  }
  return code
}

// Thrown for failures a retry can never fix (bad metadata, price mismatch, unpaid session).
// The webhook logs these and returns 200 so Stripe stops retrying. Anything else → 500 → retry.
class PermanentError extends Error {
  quiet: boolean
  constructor(message: string, opts?: { quiet?: boolean }) {
    super(message)
    this.name = 'PermanentError'
    this.quiet = opts?.quiet ?? false
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('🔵 PROCESSING SESSION:', session.id)

  if (session.metadata?.type === 'toolkit_unlock') {
    const { feature_id, promoter_id, unlock_type } = session.metadata

    if (!feature_id || !promoter_id || !unlock_type) {
      console.error('❌ toolkit_unlock missing metadata fields:', session.metadata)
      return
    }

    const { data: existing } = await supabaseAdmin
      .from('promoter_features')
      .select('id')
      .eq('promoter_id', promoter_id)
      .eq('feature_id', feature_id)
      .maybeSingle()

    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from('promoter_features')
        .insert({
          promoter_id,
          feature_id,
          unlock_type,
          unlocked_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('❌ toolkit_unlock insert error:', insertError)
        throw new Error(`toolkit_unlock insert failed: ${insertError.message}`)
      }

      console.log(`✅ toolkit_unlock granted: promoter=${promoter_id} feature=${feature_id} type=${unlock_type}`)
    } else {
      console.log(`ℹ️ toolkit_unlock already exists, skipping: promoter=${promoter_id} feature=${feature_id}`)
    }

    return
  }

  if (session.payment_status !== 'paid') {
    throw new PermanentError(`payment_status is "${session.payment_status}", not "paid"`, { quiet: true })
  }

  const { userId, eventId, items, crewId } = session.metadata || {}

  if (!userId || !eventId || !items) {
    throw new PermanentError('Missing metadata (userId, eventId or items)')
  }

  let parsedItems: { ticketTypeId: string; name: string; price: number; quantity: number }[]
  try {
    parsedItems = JSON.parse(items)
  } catch {
    throw new PermanentError('Unparseable items JSON in session metadata')
  }

  if (
    !Array.isArray(parsedItems) ||
    parsedItems.length === 0 ||
    parsedItems.some((item) => !item || !Number.isInteger(item.quantity) || item.quantity < 1)
  ) {
    throw new PermanentError('Items metadata is not a non-empty array of positive integer quantities')
  }
  console.log('📦 Items to process:', parsedItems.length)

  // Server-side price verification — reject if metadata prices don't match the DB
  await Promise.all(
    parsedItems.map(async (item) => {
      if (!item.ticketTypeId) return
      const { data: tt, error: ttError } = await supabaseAdmin
        .from('ticket_types')
        .select('price')
        .eq('id', item.ticketTypeId)
        .single()
      // PGRST116 = no row found. Any other error is a transient DB failure → retryable.
      if (ttError && ttError.code !== 'PGRST116') {
        throw new Error(`Ticket type lookup failed during price verification: ${ttError.message}`)
      }
      if (!tt) {
        throw new PermanentError(`Ticket type ${item.ticketTypeId} not found during price verification`)
      }
      if (Math.abs(tt.price - item.price) > 0.01) {
        throw new PermanentError(`Price mismatch detected on ticket type ${item.ticketTypeId}`)
      }
    })
  )

  const orderId = randomUUID()
  const orderNumber = `RTNY-${Date.now()}-${randomBytes(5).toString('hex').toUpperCase()}`

  const pOrder = {
    id: orderId,
    user_id: userId,
    event_id: eventId,
    order_number: orderNumber,
    subtotal: (session.amount_subtotal || 0) / 100,
    total_amount: (session.amount_total || 0) / 100,
    fees: ((session.amount_total || 0) - (session.amount_subtotal || 0)) / 100,
    discount_amount: 0,
    tax_amount: 0,
    customer_email: session.customer_email || '',
    payment_intent_id: session.payment_intent as string,
    transaction_id: session.id,
    session_id: session.id,
    payment_status: 'captured',
    payment_method: 'card',
    status: 'completed',
    completed_at: new Date().toISOString(),
    promo_code_id: null,
    crew_id: crewId || null,
  }

  // Build ticket rows
  const ticketStubs: {
    event_id: string
    order_id: string
    ticket_type: string
    ticket_number: string
    base_price: number
    purchase_price: number
    purchased_by: string
    purchase_date: string
    payment_intent_id: string | null
    confirmation_code: string
    qr_code_data: string
    status: string
  }[] = []

  let ticketIndex = 0
  for (const item of parsedItems) {
    for (let i = 0; i < item.quantity; i++) {
      ticketIndex++
      const ticketNumber = `${orderId}-T${String(ticketIndex).padStart(3, '0')}`
      ticketStubs.push({
        event_id: eventId,
        order_id: orderId,
        ticket_type: item.name || 'General Admission',
        ticket_number: ticketNumber,
        base_price: item.price,
        purchase_price: item.price,
        purchased_by: userId,
        purchase_date: new Date().toISOString(),
        payment_intent_id: (session.payment_intent as string) ?? null,
        confirmation_code: generateConfirmationCode(),
        qr_code_data: ticketNumber, // placeholder; overwritten below
        status: 'purchased',
      })
    }
  }

  // Generate QR codes non-blocking — failures fall back to ticket number
  await Promise.allSettled(
    ticketStubs.map(async (stub) => {
      try {
        const qrData = JSON.stringify({
          ticketNumber: stub.ticket_number,
          eventId,
          orderId,
          timestamp: new Date().toISOString(),
        })
        stub.qr_code_data = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        })
        console.log('✅ QR generated for', stub.ticket_number)
      } catch (qrErr) {
        console.error('⚠️ QR generation failed for', stub.ticket_number, qrErr)
        // qr_code_data stays as ticketNumber fallback
      }
    })
  )

  // Order, tickets and inventory decrement happen in one transaction, idempotent on session_id.
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('process_checkout_completed', {
    p_order: pOrder,
    p_tickets: ticketStubs,
    p_items: parsedItems,
  })

  if (rpcError) {
    console.error('❌ process_checkout_completed error:', session.id, rpcError)
    throw new Error(`process_checkout_completed failed: ${rpcError.message}`)
  }

  const result = rpcData as {
    order_id: string
    duplicate: boolean
    needs_review: boolean
    reasons: string[] | null
  } | null

  if (!result || !result.order_id) {
    throw new Error(`process_checkout_completed returned no result for session ${session.id}`)
  }

  if (result.duplicate) {
    console.log(`ℹ️ Duplicate delivery for session ${session.id} (order ${result.order_id}) — already processed, skipping`)
    return
  }

  console.log(`✅ Order ${result.order_id} created via process_checkout_completed (${ticketStubs.length} tickets)`)

  if (result.needs_review) {
    console.error(
      `🚨 NEEDS REVIEW: order_id=${result.order_id} session=${session.id} reasons=${JSON.stringify(result.reasons)}`
    )
  }

  // Confirmation email — awaited, but a failure here must never fail the order.
  try {
    const { data: createdTickets, error: createdTicketsError } = await supabaseAdmin
      .from('tickets')
      .select()
      .eq('order_id', result.order_id)

    if (createdTicketsError || !createdTickets || createdTickets.length === 0) {
      throw new Error(`Could not fetch tickets for order ${result.order_id}: ${createdTicketsError?.message ?? 'none found'}`)
    }

    // Shape the email template reads from
    const order = { id: result.order_id, total_amount: pOrder.total_amount }

    // Fetch event and venue for email
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select(`name, event_date, venues!inner (name, address)`)
      .eq('id', eventId)
      .single()

    if (eventData && session.customer_email) {
      const attachments = createdTickets.map((ticket, index) => {
        const base64Data = ticket.qr_code_data.includes(',')
          ? ticket.qr_code_data.split(',')[1]
          : ticket.qr_code_data
        return {
          filename: `ticket-${index + 1}.png`,
          content: base64Data,
          contentType: 'image/png',
          contentId: `qr-${ticket.id}`,
        }
      })

      const emailResult = await resend.emails.send({
        from: 'RTNY <onboarding@resend.dev>',
        to: session.customer_email,
        subject: `Order Confirmed - ${eventData.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
                .header { background: #121113; color: #59FFA0; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .ticket { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #59FFA0; }
                .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Order Confirmed!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #F9FDFF;">
                    Order #${order.id}
                  </p>
                </div>

                <div class="content">
                  <h2 style="color: #121113; margin-top: 0;">Thanks for your purchase!</h2>
                  <p>Your tickets for <strong>${eventData.name}</strong> are ready.</p>

                  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #121113;">📍 Event Details</h3>
                    <p style="margin: 5px 0;"><strong>Event:</strong> ${eventData.name}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(eventData.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}</p>
                    <p style="margin: 5px 0;"><strong>Venue:</strong> ${(eventData.venues as any).name}</p>
                    <p style="margin: 5px 0;"><strong>Address:</strong> ${(eventData.venues as any).address}</p>
                  </div>

                  <h3 style="color: #121113;">🎫 Your Tickets</h3>
                  ${createdTickets.map((ticket, index) => `
                    <div class="ticket">
                      <p style="margin: 0 0 5px 0; font-weight: bold;">${ticket.ticket_type}</p>
                      <p style="margin: 0; font-size: 12px; color: #666;">Ticket #${ticket.ticket_number}</p>

                      <div style="margin: 15px 0; text-align: center; background: white; padding: 10px; border-radius: 8px;">
                        <img
                          src="cid:qr-${ticket.id}"
                          alt="QR Code"
                          width="200"
                          height="200"
                          style="border: 2px solid #121113; border-radius: 8px; display: block; margin: 0 auto;"
                        />
                        <p style="font-size: 11px; color: #666; margin: 8px 0 0 0;">
                          📱 Show this QR code at the venue
                        </p>
                      </div>

                      <p style="margin: 5px 0 0 0; color: #59FFA0; font-weight: bold;">$${ticket.purchase_price.toFixed(2)}</p>
                    </div>
                  `).join('')}

                  <div style="font-size: 24px; font-weight: bold; color: #59FFA0; margin-top: 20px;">
                    Total Paid: $${order.total_amount.toFixed(2)}
                  </div>

                  <div style="margin-top: 30px; padding: 20px; background: #FFF9E6; border-radius: 8px; border-left: 4px solid #FFB800;">
                    <p style="margin: 0; font-size: 14px;">
                      <strong>📱 View Your Tickets:</strong><br/>
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets" style="color: #1AC8ED; text-decoration: none;">
                        View My Tickets →
                      </a>
                    </p>
                  </div>
                </div>

                <div class="footer">
                  <p>RTNY - Rochester's Premier Nightlife Ticketing Platform</p>
                </div>
              </div>
            </body>
          </html>
        `,
        attachments,
      })

      // Resend's SDK returns { data, error } rather than throwing on API errors
      if (emailResult.error) {
        console.error('❌ Email send failed:', emailResult.error)
      } else {
        console.log('✅ Confirmation email sent to', session.customer_email)
      }
    }
  } catch (emailErr) {
    console.error('❌ Confirmation email step failed (order is unaffected):', result.order_id, emailErr)
  }

  // Reset the crew's sticker attempts on a qualifying purchase — awaited, non-fatal,
  // capped once a crew hits its lifetime sticker limit.
  if (crewId) {
    try {
      const { data: crewRow, error: crewFetchError } = await supabaseAdmin
        .from('crews')
        .select('lifetime_sticker_count')
        .eq('id', crewId)
        .single()

      if (crewFetchError || !crewRow) {
        console.error('⚠️ Sticker attempts reset — failed to fetch crew', crewId, crewFetchError)
      } else if (crewRow.lifetime_sticker_count < 16) {
        const { error: resetError } = await supabaseAdmin
          .from('crews')
          .update({ sticker_attempts_remaining: 6 })
          .eq('id', crewId)

        if (resetError) {
          console.error('⚠️ Sticker attempts reset failed for crew', crewId, resetError)
        } else {
          console.log('✅ Sticker attempts reset to 6 for crew', crewId)
        }
      }
    } catch (err) {
      console.error('⚠️ Sticker attempts reset error for crew', crewId, err)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown'
      console.error('❌ Webhook signature verification failed:', msg)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('🟡 WEBHOOK HIT:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      try {
        await handleCheckoutComplete(session)
      } catch (err) {
        if (err instanceof PermanentError) {
          if (err.quiet) {
            console.log(`ℹ️ Skipping session ${session.id}: ${err.message}`)
          } else {
            console.error(
              `🚨 PERMANENT WEBHOOK FAILURE (not retrying) session=${session.id} eventId=${session.metadata?.eventId ?? 'n/a'} customer_email=${session.customer_email ?? 'n/a'} reason=${err.message}`
            )
          }
          return NextResponse.json({ received: true }, { status: 200 })
        }
        console.error('❌ Webhook processing failed — returning 500 so Stripe retries. session=', session.id, err)
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: unknown) {
    console.error('❌ Webhook handler error:', JSON.stringify(error, Object.getOwnPropertyNames(error as object)))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
