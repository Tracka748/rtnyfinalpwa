import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'

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

    const supabase = await createCookieClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        total_amount,
        customer_email,
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
          qr_code_data
        )
      `)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error) {
      // If session_id column doesn't exist yet, return 404 so the
      // confirmation page keeps polling rather than hard-erroring
      if (error.code === '42703') {
        console.warn('Orders session_id column missing — run migration 20260329_orders_add_session_id.sql')
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      console.error('Order lookup error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Owner or admin only. Anything else is a 404 so order ids can't be probed.
    if (order.user_id !== user.id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Order access profile lookup error:', profileError)
      }

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
    }

    const { user_id: _userId, ...orderResponse } = order
    return NextResponse.json(orderResponse)

  } catch (error: unknown) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
