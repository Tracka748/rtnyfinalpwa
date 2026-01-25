import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { OrderConfirmationEmail } from '@/lib/emails/order-confirmation'

// Upload snippet: For local testing in test mode, run this in terminal:
// stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
// This will provide a webhook signing secret for your .env file.
// For production: stripe webhook_endpoints create --url https://yourdomain.com/api/v1/stripe/webhook --events checkout.session.completed

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Create Supabase admin client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY!)

// CRITICAL: Disable body parsing for Stripe webhooks
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received!')
  
  try {
    // Read the raw body as text
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    if (!body) {
      console.error('❌ Empty request body')
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      console.log('✅ Webhook verified:', event.type)
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('💰 Processing completed checkout session...')
      console.log('Session ID:', session.id)
      console.log('Amount:', session.amount_total)
      
      try {
        // Extract metadata
        const { userId, eventId, items, promoCode } = session.metadata || {}

        if (!userId || !eventId || !items) {
          console.error('❌ Missing metadata:', session.metadata)
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        const parsedItems = JSON.parse(items)
        console.log('📦 Items to process:', parsedItems.length)

        // Generate unique order number
        const orderNumber = `RTNY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        console.log('💾 Creating order:', orderNumber)

        // Create order in database
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: userId,
            event_id: eventId,
            order_number: orderNumber,
            total_amount: (session.amount_total || 0) / 100,
            subtotal: (session.amount_subtotal || 0) / 100,
            fees: ((session.amount_total || 0) - (session.amount_subtotal || 0)) / 100,
            discount_amount: 0,
            tax_amount: 0,
            promo_code_used: promoCode || null,
            promo_code_id: null,
            payment_status: 'captured', // ✅ Valid enum value
            payment_method: 'card',
            payment_intent_id: session.payment_intent as string,
            transaction_id: session.id,
            customer_email: session.customer_email || 'unknown@email.com',
            status: 'completed', // ✅ Valid enum value
          })
          .select()
          .single()

        if (orderError) {
          console.error('❌ Order creation error:', orderError)
          return NextResponse.json({ 
            error: 'Order creation failed', 
            code: orderError.code,
            details: orderError.message 
          }, { status: 500 })
        }

        console.log('✅ Order created:', order.id)

        // Create tickets for each item
        const ticketsToCreate = []
        for (const item of parsedItems) {
          for (let i = 0; i < item.quantity; i++) {
            const ticketNumber = `${orderNumber}-T${String(ticketsToCreate.length + 1).padStart(3, '0')}`
            
            ticketsToCreate.push({
              event_id: eventId,
              order_id: order.id, // ✅ Links ticket to order
              ticket_type: item.name || 'General Admission',
              ticket_number: ticketNumber,
              base_price: parseFloat(item.price),
              purchase_price: parseFloat(item.price),
              purchased_by: userId,
              purchase_date: new Date().toISOString(),
              payment_intent_id: session.payment_intent as string,
              confirmation_code: ticketNumber,
              qr_code_data: ticketNumber,
              status: 'purchased',
            })
          }
        }

        console.log('🎫 Creating', ticketsToCreate.length, 'tickets')

        const { data: createdTickets, error: ticketsError } = await supabaseAdmin
          .from('tickets')
          .insert(ticketsToCreate)
          .select()

        if (ticketsError) {
          console.error('❌ Tickets creation error:', ticketsError)
          return NextResponse.json({ 
            error: 'Tickets creation failed', 
            code: ticketsError.code,
            details: ticketsError.message,
            orderId: order.id
          }, { status: 500 })
        }

        console.log(`✅ Created ${ticketsToCreate.length} tickets for order ${order.id}`)

        // Fetch event and venue details for email
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select(`
            name,
            event_date,
            venues!inner (
              name,
              address
            )
          `)
          .eq('id', eventId)
          .single()

        // Send confirmation email (async, don't await)
        if (eventData && session.customer_email) {
          resend.emails.send({
            from: 'RTNY <onboarding@resend.dev>', // Using Resend test domain
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
                    h1 { margin: 0; font-size: 28px; }
                    .total { font-size: 24px; font-weight: bold; color: #59FFA0; margin-top: 20px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🎉 Order Confirmed!</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #F9FDFF;">
                        Order #${orderNumber}
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
                        <p style="margin: 5px 0;"><strong>Venue:</strong> ${eventData.venues.name}</p>
                        <p style="margin: 5px 0;"><strong>Address:</strong> ${eventData.venues.address}</p>
                      </div>

                      <h3 style="color: #121113;">🎫 Your Tickets</h3>
                      ${createdTickets.map(ticket => `
                        <div class="ticket">
                          <p style="margin: 0 0 5px 0; font-weight: bold;">${ticket.ticket_type}</p>
                          <p style="margin: 0; font-size: 12px; color: #666;">Ticket #${ticket.ticket_number}</p>
                          <p style="margin: 5px 0 0 0; color: #59FFA0; font-weight: bold;">$${ticket.purchase_price.toFixed(2)}</p>
                        </div>
                      `).join('')}

                      <div class="total">
                        Total Paid: $${order.total_amount.toFixed(2)}
                      </div>

                      <div style="margin-top: 30px; padding: 20px; background: #FFF9E6; border-radius: 8px; border-left: 4px solid #FFB800;">
                        <p style="margin: 0; font-size: 14px;">
                          <strong>📱 View Your Tickets:</strong><br/>
                          Log in to your RTNY account to view, download, and manage your tickets:<br/>
                          <a href="http://localhost:3000/dashboard/tickets" style="color: #1AC8ED; text-decoration: none;">
                            View My Tickets →
                          </a>
                        </p>
                      </div>
                    </div>

                    <div class="footer">
                      <p>RTNY - Rochester's Premier Nightlife Ticketing Platform</p>
                      <p>Questions? Contact us at support@rtny.com</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          }).then(() => {
            console.log('✅ Confirmation email sent to', session.customer_email)
          }).catch((err) => {
            console.error('❌ Email send failed:', err)
          })
        }

        return NextResponse.json({ 
          received: true, 
          orderId: order.id,
          orderNumber: orderNumber,
          ticketCount: createdTickets.length,
          emailSent: !!session.customer_email
        })
      } catch (error: any) {
        console.error('❌ Webhook processing error:', error)
        return NextResponse.json({ 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 })
      }
    }

    // Handle other event types (optional logging)
    console.log('ℹ️ Received event type:', event.type, '- ignoring')
    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
