import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase'

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
    // Auth check — must be a logged-in user
    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    console.log('🔍 Looking for order with session_id:', sessionId)

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
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

    // Ownership check — ensure the order belongs to the authenticated user
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
