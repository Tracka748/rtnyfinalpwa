// app/api/v1/promo/auto-apply/route.ts
// Get auto-applicable promo codes for authenticated members

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const body = await request.json()
    const { eventId, subtotal } = body

    // Create Supabase client with user's session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        autoApply: false,
        message: 'Not authenticated'
      })
    }

    // Validate required fields
    if (!subtotal) {
      return NextResponse.json(
        { 
          autoApply: false,
          error: 'Subtotal is required'
        },
        { status: 400 }
      )
    }

    // Use service role for the RPC call
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call the get_auto_apply_promos database function
    const { data, error } = await serviceSupabase.rpc('get_auto_apply_promos', {
      p_user_id: user.id,
      p_event_id: eventId || null,
      p_subtotal: subtotal
    })

    if (error) {
      console.error('Auto-apply promo error:', error)
      return NextResponse.json({
        autoApply: false,
        message: 'Unable to fetch auto-apply promos'
      })
    }

    // Check if any promo was returned
    if (!data || data.length === 0) {
      return NextResponse.json({
        autoApply: false,
        message: 'No auto-apply promos available'
      })
    }

    const promo = data[0]

    // Return the best auto-applicable promo
    return NextResponse.json({
      autoApply: true,
      promoId: promo.promo_id,
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount: promo.discount_amount,
      message: `${promo.code} auto-applied: $${promo.discount_amount.toFixed(2)} off`
    })

  } catch (error) {
    console.error('Auto-apply promo error:', error)
    return NextResponse.json(
      {
        autoApply: false,
        error: 'Server error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}