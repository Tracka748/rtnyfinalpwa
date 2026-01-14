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
    console.log('🔑 Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...')
    
    // First, try to find ANY orders (test RLS)
    const { data: allOrders, error: allError } = await supabaseAdmin
      .from('orders')
      .select('order_number, transaction_id')
      .limit(5)
    
    console.log('📊 Total orders in DB:', allOrders?.length || 0)
    if (allOrders && allOrders.length > 0) {
      console.log('📋 Recent orders:', allOrders.map(o => ({ 
        order: o.order_number, 
        txn: o.transaction_id?.substring(0, 20) + '...' 
      })))
    }
    
    // Now try to find the specific order
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        customer_email,
        created_at,
        tickets (
          id,
          ticket_number,
          ticket_type,
          base_price,
          qr_code_data
        )
      `)
      .eq('transaction_id', sessionId)
      .single()

    if (error) {
      console.log('❌ Query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          error: 'Order not found', 
          code: error.code,
          message: error.message,
          sessionId: sessionId
        },
        { status: 404 }
      )
    }

    console.log('✅ Order found:', order.order_number, 'with', order.tickets?.length, 'tickets')
    return NextResponse.json(order)
    
  } catch (error: any) {
    console.error('❌ Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
