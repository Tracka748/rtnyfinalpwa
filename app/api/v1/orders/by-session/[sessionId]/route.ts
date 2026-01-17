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
        order_number,
        total_amount,
        customer_email,
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
      .eq('transaction_id', sessionId)
      .single()

    if (error) {
      console.log('❌ Order not found:', error.message)
      return NextResponse.json(
        { 
          error: 'Order not found', 
          code: error.code,
          message: error.message
        },
        { status: 404 }
      )
    }

    console.log('✅ Order found:', order.order_number, 'for event:', (order as any)['events']['name'])
    return NextResponse.json(order)
    
  } catch (error: any) {
    console.error('❌ Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}