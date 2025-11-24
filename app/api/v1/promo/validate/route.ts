// app/api/v1/promo/validate/route.ts
// Validate promo code and return discount details

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, userId, eventId, subtotal } = body

    // Validate required fields
    if (!code || !subtotal) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Missing required fields',
          message: 'Promo code and subtotal are required'
        },
        { status: 400 }
      )
    }

    // Call the validate_promo_code database function
    const { data, error } = await supabase.rpc('validate_promo_code', {
      p_code: code,
      p_user_id: userId || null,
      p_event_id: eventId || null,
      p_subtotal: subtotal
    })

    if (error) {
      console.error('Promo validation error:', error)
      return NextResponse.json(
        {
          valid: false,
          error: 'Validation failed',
          message: 'Unable to validate promo code'
        },
        { status: 500 }
      )
    }

    // The function returns an array with one result
    const result = data?.[0]

    if (!result || !result.valid) {
      return NextResponse.json({
        valid: false,
        message: result?.message || 'Invalid promo code'
      })
    }

    // Return successful validation
    return NextResponse.json({
      valid: true,
      promoId: result.promo_id,
      code: code.toUpperCase(),
      discountType: result.discount_type,
      discountValue: result.discount_value,
      discountAmount: result.discount_amount,
      message: result.message
    })

  } catch (error) {
    console.error('Promo validation error:', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Server error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}