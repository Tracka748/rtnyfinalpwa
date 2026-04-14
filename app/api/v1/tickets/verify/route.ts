import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// TODO: replace with proper admin session auth post-launch

export async function POST(request: NextRequest) {
  try {
    // Shared-secret check — scanner devices must supply the server-side secret
    const scannerToken = request.headers.get('x-scanner-token')
    if (!scannerToken || scannerToken !== process.env.SCANNER_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'code is required', code: 'MISSING_CODE' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()
    const trimmedCode = code.trim()

    // Step 1: Find ticket by confirmation_code OR ticket_number
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, event_id, ticket_type, ticket_number, confirmation_code, status, purchased_by, updated_at')
      .or(`confirmation_code.eq.${trimmedCode},ticket_number.eq.${trimmedCode}`)
      .maybeSingle()

    if (ticketError) {
      console.error('[verify] ticket query error:', ticketError)
      return NextResponse.json(
        { error: 'Failed to query ticket', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Step 2: Check status before doing anything else
    if (ticket.status === 'used') {
      return NextResponse.json(
        { error: 'Ticket already scanned', code: 'ALREADY_USED', scanned_at: ticket.updated_at },
        { status: 409 }
      )
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return NextResponse.json(
        { error: 'Ticket is not valid', code: 'INVALID_STATUS', status: ticket.status },
        { status: 410 }
      )
    }

    // Step 3: Fetch event and profile separately (parallel)
    const [eventResult, profileResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date')
        .eq('id', ticket.event_id)
        .maybeSingle(),

      ticket.purchased_by
        ? supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', ticket.purchased_by)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    // Step 4: Mark ticket as used
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'used', updated_at: new Date().toISOString() })
      .eq('id', ticket.id)

    if (updateError) {
      console.error('[verify] update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark ticket as used', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    const event = eventResult.data
    const profile = profileResult.data

    const holderName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      'Unknown'

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        confirmation_code: ticket.confirmation_code,
        ticket_type: ticket.ticket_type,
        status: 'used',
      },
      event: event
        ? { id: event.id, name: event.name, event_date: event.event_date }
        : null,
      holder: {
        display_name: holderName,
        email: profile?.email ?? null,
      },
    })
  } catch (error) {
    console.error('[verify] unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
