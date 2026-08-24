import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const VALID_TICKET_FORMATS = ['digital', 'physical', 'both']
const VALID_FEE_PAYERS = ['buyer', 'promoter']

// Validates the optional printing/distribution fields on a ticket_prices entry.
// `strict` additionally requires fee_payer when ticket_format is physical/both —
// only enforced on submit-for-review, not on incomplete draft saves.
function validateOptionalTicketFields(type: string, value: any, strict: boolean): string | null {
  if (value.ticket_format !== undefined && !VALID_TICKET_FORMATS.includes(value.ticket_format)) {
    return `Invalid ticket_format for ticket type "${type}". Must be one of: ${VALID_TICKET_FORMATS.join(', ')}`
  }

  if (
    value.fee_payer !== undefined &&
    value.fee_payer !== null &&
    !VALID_FEE_PAYERS.includes(value.fee_payer)
  ) {
    return `Invalid fee_payer for ticket type "${type}". Must be one of: ${VALID_FEE_PAYERS.join(', ')}, or null`
  }

  if (
    value.printing_quantity !== undefined &&
    value.printing_quantity !== null &&
    typeof value.printing_quantity !== 'number'
  ) {
    return `Invalid printing_quantity for ticket type "${type}". Must be a number or null`
  }

  if (value.rtny_distribution !== undefined && typeof value.rtny_distribution !== 'boolean') {
    return `Invalid rtny_distribution for ticket type "${type}". Must be a boolean`
  }

  if (
    strict &&
    (value.ticket_format === 'physical' || value.ticket_format === 'both') &&
    !value.fee_payer
  ) {
    return `fee_payer is required for ticket type "${type}" when ticket_format is physical or both`
  }

  return null
}

// Removes server-computed fields a client should never be able to set directly.
function stripServerComputedFields(ticketPrices: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  for (const [type, value] of Object.entries(ticketPrices)) {
    const { estimated_printing_cost_cents, ...rest } = value as Record<string, any>
    sanitized[type] = rest
  }
  return sanitized
}

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

      // Validate event_end_date, unless the promoter marked the end time as TBD
      const untilTbd = body.until_tbd === true
      if (!untilTbd) {
        if (!body.event_end_date) {
          console.error('❌ Missing event_end_date (until_tbd is false)')
          return NextResponse.json(
            {
              error: 'event_end_date is required unless until_tbd is true',
              code: 'VALIDATION_ERROR',
              received: body.event_end_date
            },
            { status: 400 }
          )
        }

        const eventEndDate = new Date(body.event_end_date)
        if (isNaN(eventEndDate.getTime())) {
          console.error('❌ Invalid date format:', body.event_end_date)
          return NextResponse.json(
            {
              error: 'Invalid event_end_date format. Must be ISO 8601 format.',
              code: 'VALIDATION_ERROR',
              received: body.event_end_date,
              example: '2025-03-15T23:00:00'
            },
            { status: 400 }
          )
        }

        if (eventEndDate <= eventDate) {
          console.error('❌ event_end_date is not after event_date:', body.event_end_date)
          return NextResponse.json(
            {
              error: 'Event end time must be after the start time',
              code: 'VALIDATION_ERROR',
              received: { event_date: body.event_date, event_end_date: body.event_end_date }
            },
            { status: 400 }
          )
        }
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

        const optionalFieldError = validateOptionalTicketFields(type, value, true)
        if (optionalFieldError) {
          console.error(`❌ ${optionalFieldError}`)
          return NextResponse.json(
            { error: optionalFieldError, code: 'VALIDATION_ERROR', received: value },
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

      // Validate event_end_date format only if provided, and its relation to
      // event_date only if that's present and valid too
      if (body.event_end_date) {
        const eventEndDate = new Date(body.event_end_date)
        if (isNaN(eventEndDate.getTime())) {
          console.error('❌ Invalid date format:', body.event_end_date)
          return NextResponse.json(
            {
              error: 'Invalid event_end_date format. Must be ISO 8601 format.',
              code: 'VALIDATION_ERROR',
              received: body.event_end_date,
              example: '2025-03-15T23:00:00'
            },
            { status: 400 }
          )
        }

        if (body.event_date) {
          const eventDate = new Date(body.event_date)
          if (!isNaN(eventDate.getTime()) && eventEndDate <= eventDate) {
            console.error('❌ event_end_date is not after event_date:', body.event_end_date)
            return NextResponse.json(
              {
                error: 'Event end time must be after the start time',
                code: 'VALIDATION_ERROR',
                received: { event_date: body.event_date, event_end_date: body.event_end_date }
              },
              { status: 400 }
            )
          }
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

          const optionalFieldError = validateOptionalTicketFields(type, value, false)
          if (optionalFieldError) {
            console.error(`❌ ${optionalFieldError}`)
            return NextResponse.json(
              { error: optionalFieldError, code: 'VALIDATION_ERROR', received: value },
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
      event_end_date: body.event_end_date || null,
      theme_id: body.theme_id || null,
      theme_custom_text: body.theme_custom_text || null,
      venue_id: body.venue_id || null,
      venue_name: body.venue_name || null,
      total_tickets: body.total_tickets || 0,
      flyer_image_url: body.flyer_image_url || null,
      ticket_prices: stripServerComputedFields(body.ticket_prices || {}),
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

    // Log a custom (non-catalog) theme as a suggestion for admin review.
    // Best-effort — never blocks the draft save itself.
    if (body.theme_custom_text && !body.theme_id) {
      const { error: suggestionError } = await supabase
        .from('theme_suggestions')
        .insert({
          name: body.theme_custom_text,
          submitted_by_user_id: user.id,
          event_draft_id: data.id,
          status: 'pending',
        })

      if (suggestionError) {
        console.error('Failed to log theme suggestion (non-blocking):', suggestionError)
      }
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