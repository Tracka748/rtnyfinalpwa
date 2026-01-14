import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received!')
  
  try {
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      console.log('💰 Processing completed checkout session...')
      console.log('Session ID:', session.id)
      console.log('Amount:', session.amount_total)
      
      try {
        const { userId, eventId, items, promoCode } = session.metadata || {}

        if (!userId || !eventId || !items) {
          console.error('❌ Missing metadata:', session.metadata)
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        const parsedItems = JSON.parse(items)
        console.log('📦 Items to process:', parsedItems.length)

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
            payment_status: 'captured', // ✅ FIXED - Valid enum value
            payment_method: 'card',
            payment_intent_id: session.payment_intent as string,
            transaction_id: session.id,
            customer_email: session.customer_email || 'unknown@email.com',
            status: 'completed', // ✅ This is correct (order_status enum)
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
              order_id: order.id, // ✅ ADD THIS LINE - Links ticket to order
              ticket_type: item.name || 'General Admission',
              ticket_number: ticketNumber, // ✅ Required field
              base_price: parseFloat(item.price), // ✅ Required field
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

        return NextResponse.json({ 
          received: true, 
          orderId: order.id,
          orderNumber: orderNumber,
          ticketCount: ticketsToCreate.length,
          message: 'Order and tickets created successfully'
        })
      } catch (error: any) {
        console.error('❌ Webhook processing error:', error)
        return NextResponse.json({ 
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 })
      }
    }

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