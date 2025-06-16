import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { code, event_id, ticket_quantity } = await request.json()
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get promo code from database
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()
    
    if (error || !promoCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid promo code' 
      })
    }
    
    // Check if expired
    if (promoCode.expires_at && new Date() > new Date(promoCode.expires_at)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code has expired' 
      })
    }
    
    // Check usage limit
    if (promoCode.current_uses + ticket_quantity > promoCode.max_uses) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code usage limit exceeded' 
      })
    }
    
    // Check event applicability
    if (!promoCode.applies_to_all_events) {
      if (!promoCode.specific_event_ids?.includes(event_id)) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Promo code not valid for this event' 
        })
      }
    }
    
    // Get event price for calculation
    const { data: event } = await supabase
      .from('events')
      .select('ticket_price')
      .eq('id', event_id)
      .single()
    
    if (!event) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Event not found' 
      })
    }
    
    // Calculate discount
    const originalPrice = event.ticket_price * ticket_quantity
    let discountAmount = 0
    
    if (promoCode.discount_type === 'fixed') {
      discountAmount = Math.min(promoCode.discount_value, originalPrice)
    } else {
      discountAmount = originalPrice * (promoCode.discount_value / 100)
    }
    
    const finalPrice = originalPrice - discountAmount
    
    return NextResponse.json({
      valid: true,
      discount_amount: discountAmount,
      original_price: originalPrice,
      final_price: finalPrice,
      promo_code: promoCode
    })
    
  } catch (error) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Server error' 
    }, { status: 500 })
  }
}
