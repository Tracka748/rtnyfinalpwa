import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// POST /api/v1/promoter/events/draft - Save event draft
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    console.log('📥 Draft submission:', JSON.stringify(body, null, 2))
    console.log('📋 Fields:', Object.keys(body))

    // Check if submitting for review or just saving draft
    const isSubmittingForReview = body.submit_for_review === true
    console.log('📝 Mode:', isSubmittingForReview ? 'SUBMIT FOR REVIEW' : 'SAVE DRAFT')

    const validCategories = ['nightlife', 'family', 'sports', 'arts', 'dining', 'movies']

    if (isSubmittingForReview) {
      // STRICT VALIDATION - All fields required for submission
      console.log('🔒 Running strict validation for review submission...')

      const requiredFields = ['name', 'category', 'event_date', 'ticket_prices']
      const missingFields = requiredFields.filter(field => !body[field])

      // Venue check: accept either venue_id or venue_name
      if (!body.venue_id && !body.venue_name) {
        missingFields.push('venue (venue_id or venue_name)')
      }

      if (missingFields.length > 0) {
        console.error('❌ Missing fields:', missingFields)
        return NextResponse.json(
          {
            error: `Missing required fields: ${missingFields.join(', ')}`,
            code: 'VALIDATION_ERROR',
            received_fields: Object.keys(body),
            missing_fields: missingFields
          },
          { status: 400 }
        )
      }

      // Validate category
      if (!validCategories.includes(body.category)) {
        console.error('❌ Invalid category:', body.category)
        return NextResponse.json(
          {
            error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
            code: 'VALIDATION_ERROR',
            received: body.category,
            valid_options: validCategories
          },
          { status: 400 }
        )
      }

      // Validate date
      const eventDate = new Date(body.event_date)
      if (isNaN(eventDate.getTime())) {
        console.error('❌ Invalid date format:', body.event_date)
        return NextResponse.json(
          {
            error: 'Invalid event_date format. Must be ISO 8601 format.',
            code: 'VALIDATION_ERROR',
            received: body.event_date,
            example: '2025-03-15T19:00:00'
          },
          { status: 400 }
        )
      }

      if (eventDate < new Date()) {
        console.error('❌ Event date is in the past:', body.event_date)
        return NextResponse.json(
          {
            error: 'Event date must be in the future',
            code: 'VALIDATION_ERROR',
            received: body.event_date,
            current_time: new Date().toISOString()
          },
          { status: 400 }
        )
      }

      // Validate ticket_prices
      if (!body.ticket_prices || typeof body.ticket_prices !== 'object') {
        console.error('❌ Invalid ticket_prices:', body.ticket_prices)
        return NextResponse.json(
          {
            error: 'ticket_prices must be an object with price values',
            code: 'VALIDATION_ERROR',
            received: body.ticket_prices,
            example: { general: 25, vip: 50 }
          },
          { status: 400 }
        )
      }

      const priceEntries = Object.entries(body.ticket_prices)
      if (priceEntries.length === 0) {
        console.error('❌ ticket_prices is empty')
        return NextResponse.json(
          {
            error: 'At least one ticket type is required',
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }

      for (const [type, value] of priceEntries) {
        const { price, quantity } = value as { price: number; quantity: number }

        if (typeof price !== 'number' || price <= 0) {
          console.error(`❌ Invalid price for ${type}:`, price)
          return NextResponse.json(
            {
              error: `Invalid price for ticket type "${type}". Must be a positive number.`,
              code: 'VALIDATION_ERROR',
              received: price
            },
            { status: 400 }
          )
        }

        if (typeof quantity !== 'number' || quantity < 0) {
          console.error(`❌ Invalid quantity for ${type}:`, quantity)
          return NextResponse.json(
            {
              error: `Invalid quantity for ticket type "${type}". Must be a non-negative number.`,
              code: 'VALIDATION_ERROR',
              received: quantity
            },
            { status: 400 }
          )
        }
      }

      console.log('✅ Strict validation passed!')
    } else {
      // LENIENT VALIDATION - Only validate types when present (for drafts)
      console.log('📝 Running lenient validation for draft save...')

      // Validate category only if provided
      if (body.category && !validCategories.includes(body.category)) {
        console.error('❌ Invalid category:', body.category)
        return NextResponse.json(
          {
            error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
            code: 'VALIDATION_ERROR',
            received: body.category,
            valid_options: validCategories
          },
          { status: 400 }
        )
      }

      // Validate date format only if provided
      if (body.event_date) {
        const eventDate = new Date(body.event_date)
        if (isNaN(eventDate.getTime())) {
          console.error('❌ Invalid date format:', body.event_date)
          return NextResponse.json(
            {
              error: 'Invalid event_date format. Must be ISO 8601 format.',
              code: 'VALIDATION_ERROR',
              received: body.event_date,
              example: '2025-03-15T19:00:00'
            },
            { status: 400 }
          )
        }
      }

      // Validate ticket_prices types only if provided
      if (body.ticket_prices && typeof body.ticket_prices === 'object') {
        for (const [type, value] of Object.entries(body.ticket_prices)) {
          const { price, quantity } = value as { price: number; quantity: number }

          if (typeof price !== 'number' || price <= 0) {
            console.error(`❌ Invalid price for ${type}:`, price)
            return NextResponse.json(
              {
                error: `Invalid price for ticket type "${type}". Must be a positive number.`,
                code: 'VALIDATION_ERROR',
                received: price
              },
              { status: 400 }
            )
          }

          if (typeof quantity !== 'number' || quantity < 0) {
            console.error(`❌ Invalid quantity for ${type}:`, quantity)
            return NextResponse.json(
              {
                error: `Invalid quantity for ticket type "${type}". Must be a non-negative number.`,
                code: 'VALIDATION_ERROR',
                received: quantity
              },
              { status: 400 }
            )
          }
        }
      }

      console.log('✅ Lenient validation passed!')
    }

    // Prepare draft data (convert empty strings to null, name is always required)
    const draftData = {
      promoter_id: user.id,
      name: body.name?.trim() || null,
      description: body.description || null,
      category: body.category || null,
      event_date: body.event_date || null,
      venue_id: body.venue_id || null,
      venue_name: body.venue_name || null,
      total_tickets: body.total_tickets || 0,
      flyer_image_url: body.flyer_image_url || null,
      ticket_prices: body.ticket_prices || {},
      tier_discounts: body.tier_discounts || {},
      status: isSubmittingForReview ? 'pending_review' : 'draft'
    }

    console.log('💾 Saving draft data:', JSON.stringify(draftData, null, 2))

    // Insert into database
    const { data, error } = await supabase
      .from('event_drafts')
      .insert([draftData])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save draft', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: draftData.status === 'pending_review' 
        ? 'Event submitted for review' 
        : 'Draft saved successfully'
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/v1/promoter/events/draft - List user's drafts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's drafts
    const { data, error } = await supabase
      .from('event_drafts')
      .select(`
        *,
        venues (
          name,
          address
        )
      `)
      .eq('promoter_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch drafts' },
        { status: 500 }
      )
    }

    // Normalize venue_name from joined venues table if not set directly
    const normalized = (data || []).map((draft: any) => ({
      ...draft,
      venue_name: draft.venue_name || draft.venues?.name || null,
    }))

    return NextResponse.json({
      success: true,
      data: normalized
    })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}