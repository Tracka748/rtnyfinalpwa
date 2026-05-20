import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

interface PlanStop {
  name: string
  estimatedSpend: number
  time?: string
  address?: string
  category?: string
}

interface Booster {
  id: string
  name: string
  price: number
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { planTitle, planDate, stops, boosters } = body as {
      planTitle: string
      planDate: string
      stops: PlanStop[]
      boosters?: Booster[]
    }

    if (!stops || stops.length === 0) {
      return NextResponse.json({ error: 'No stops provided' }, { status: 400 })
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // One line item per stop
    for (const stop of stops) {
      if (stop.estimatedSpend <= 0) continue
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: stop.name,
            description: [stop.time, stop.address].filter(Boolean).join(' · ') || stop.category || 'Day plan stop',
          },
          unit_amount: Math.round(stop.estimatedSpend * 100),
        },
        quantity: 1,
      })
    }

    // Boosters as add-ons
    if (boosters && boosters.length > 0) {
      for (const booster of boosters) {
        if (booster.price > 0) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${booster.name} (Add-on)`,
                description: 'Day plan booster',
              },
              unit_amount: Math.round(booster.price * 100),
            },
            quantity: 1,
          })
        }
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'All stops have $0 estimated spend' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}&type=day-plan`,
      cancel_url:  `${baseUrl}/checkout/day-plan?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId:    user.id,
        planTitle: planTitle || 'Day Plan',
        planDate:  planDate  || '',
        type:      'day-plan',
        stops:     JSON.stringify(stops.map(s => ({ name: s.name, spend: s.estimatedSpend }))),
        boosters:  boosters ? JSON.stringify(boosters) : '',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    console.error('Day-plan Stripe session error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
