import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkCanScan } from '@/lib/admin-auth'

const MAX_CODE_LENGTH = 500
const BRAND_PREFIX = 'RTNY-'
const TICKET_COLUMNS =
  'id, event_id, ticket_type, ticket_number, confirmation_code, status, purchased_by, used_at, updated_at'

// Scanners send either a typed code or the raw QR text, which is a JSON string like
// {"ticketNumber":"...","eventId":"...",...}. Only ticketNumber is used for lookup;
// eventId (if present) is used for the wrong-event check.
function normalizeScan(raw: string): { value: string; eventId: string | null } {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed.ticketNumber === 'string' && parsed.ticketNumber.trim()) {
        const eventId =
          typeof parsed.eventId === 'string' && parsed.eventId.trim() ? parsed.eventId.trim() : null
        return { value: parsed.ticketNumber.trim(), eventId }
      }
    } catch {
      // Not valid JSON — treat the raw string as the code
    }
  }
  return { value: trimmed, eventId: null }
}

// Confirmation codes are uppercase. The RTNY- prefix is branding: accept the code
// with or without it so typed entry works for both stored formats.
function confirmationCandidates(value: string): string[] {
  const upper = value.toUpperCase()
  const candidates = [upper]
  if (upper.startsWith(BRAND_PREFIX)) {
    const bare = upper.slice(BRAND_PREFIX.length)
    if (bare) candidates.push(bare)
  } else {
    candidates.push(BRAND_PREFIX + upper)
  }
  return candidates
}

function alreadyUsedResponse(t: { used_at?: string | null; updated_at?: string | null }) {
  return NextResponse.json(
    {
      error: 'Ticket already scanned',
      code: 'ALREADY_USED',
      // Old rows were marked used before used_at existed on this path
      scanned_at: t.used_at ?? t.updated_at ?? null,
    },
    { status: 409 }
  )
}

function invalidStatusResponse(status: string | null) {
  return NextResponse.json(
    {
      error: `Ticket cannot be admitted: status is "${status ?? 'unknown'}"`,
      code: 'INVALID_STATUS',
      status,
    },
    { status: 410 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const scanCheck = await checkCanScan()
    if (scanCheck.error) return scanCheck.response

    const body = await request.json()
    const { code } = body

    if (code === undefined || code === null || (typeof code === 'string' && !code.trim())) {
      return NextResponse.json(
        { error: 'code is required', code: 'MISSING_CODE' },
        { status: 400 }
      )
    }

    if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        { error: `code must be a string of at most ${MAX_CODE_LENGTH} characters`, code: 'INVALID_CODE' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()
    const { value, eventId: scannedEventId } = normalizeScan(code)

    // Step 1: Find ticket by ticket_number, then by confirmation_code.
    // Separate .eq() lookups — user input is never interpolated into a filter string.
    let lookup = await supabase
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('ticket_number', value)
      .maybeSingle()

    if (!lookup.error && !lookup.data) {
      for (const candidate of confirmationCandidates(value)) {
        lookup = await supabase
          .from('tickets')
          .select(TICKET_COLUMNS)
          .eq('confirmation_code', candidate)
          .maybeSingle()
        if (lookup.error || lookup.data) break
      }
    }

    const { data: ticket, error: ticketError } = lookup

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

    // Non-admins may only scan tickets for events they manage: either
    // events.promoter_id is theirs, or an approved draft of theirs was published as it.
    if (!scanCheck.isAdmin) {
      const [ownedEvent, ownedDraft] = await Promise.all([
        supabase
          .from('events')
          .select('id')
          .eq('id', ticket.event_id)
          .eq('promoter_id', scanCheck.user.id)
          .maybeSingle(),
        supabase
          .from('event_drafts')
          .select('id')
          .eq('promoter_id', scanCheck.user.id)
          .eq('status', 'approved')
          .eq('published_event_id', ticket.event_id)
          .limit(1),
      ])

      if (ownedEvent.error || ownedDraft.error) {
        console.error('[verify] ownership query error:', ownedEvent.error ?? ownedDraft.error)
        return NextResponse.json(
          { error: 'Failed to verify event ownership', code: 'DB_ERROR' },
          { status: 500 }
        )
      }

      if (!ownedEvent.data && !(ownedDraft.data && ownedDraft.data.length > 0)) {
        return NextResponse.json(
          { error: "This ticket is for an event you don't manage", code: 'NOT_YOUR_EVENT' },
          { status: 403 }
        )
      }
    }

    // Step 2: The QR payload names its event — reject tickets scanned at the wrong one
    if (scannedEventId && scannedEventId !== ticket.event_id) {
      return NextResponse.json(
        { error: 'Ticket is for a different event', code: 'WRONG_EVENT' },
        { status: 409 }
      )
    }

    // Step 3: Only 'purchased' tickets may be admitted
    if (ticket.status === 'used') {
      return alreadyUsedResponse(ticket)
    }

    if (ticket.status !== 'purchased') {
      return invalidStatusResponse(ticket.status)
    }

    // Step 4: Fetch event and profile separately (parallel)
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

    // Step 5: Atomically mark as used — only succeeds if still 'purchased'
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'used', used_at: now, updated_at: now })
      .eq('id', ticket.id)
      .eq('status', 'purchased')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('[verify] update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark ticket as used', code: 'UPDATE_ERROR' },
        { status: 500 }
      )
    }

    if (!updated) {
      // Lost a race (or status changed since we read it) — re-read to report why
      const { data: current, error: rereadError } = await supabase
        .from('tickets')
        .select('id, status, used_at, updated_at')
        .eq('id', ticket.id)
        .maybeSingle()

      if (rereadError) {
        console.error('[verify] re-read error:', rereadError)
        return NextResponse.json(
          { error: 'Failed to query ticket', code: 'DB_ERROR' },
          { status: 500 }
        )
      }

      if (!current) {
        return NextResponse.json(
          { error: 'Ticket not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (current.status === 'used') {
        return alreadyUsedResponse(current)
      }

      return invalidStatusResponse(current.status)
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
        name: holderName,
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
