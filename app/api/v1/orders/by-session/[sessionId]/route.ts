import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    console.log('🔍 Looking for order with session_id:', sessionId)

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        event_id,
        events!inner (
          id,
          name,
          event_date,
          flyer_image_url,
          category,
          venue_id,
          venues!inner (
            id,
            name,
            address
          )
        ),
        tickets (
          id,
          ticket_number,
          ticket_type,
          base_price,
          qr_code_data,
          confirmation_code
        )
      `)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error) {
      // If session_id column doesn't exist yet, return 404 so the
      // confirmation page keeps polling rather than hard-erroring
      if (error.code === '42703') {
        console.warn('⚠️ session_id column missing on orders — run migration 20260329_orders_add_session_id.sql')
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      console.error('❌ Order lookup error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      return NextResponse.json(
        { error: 'Order lookup failed', code: error.code, message: error.message },
        { status: 500 }
      )
    }

    if (!order) {
      console.log('❌ No order found for session_id:', sessionId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('✅ Order found:', order.id, 'for event:', (order as any)['events']['name'])
    return NextResponse.json(order)

  } catch (error: unknown) {
    const err = error as Error
    console.error('❌ Error fetching order:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}
