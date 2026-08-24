import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/event-drafts/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const supabase = createSupabaseAdmin()
    const { id } = await params

    // Fetch the draft with venue info
    const { data: draft, error: fetchError } = await supabase
      .from('event_drafts')
      .select(`
        *,
        venues (
          name,
          address
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: 'Event draft not found' },
        { status: 404 }
      )
    }

    if (draft.status !== 'pending_review') {
      return NextResponse.json(
        { error: 'Only pending events can be approved' },
        { status: 400 }
      )
    }

    const ticketPriceEntries = Object.entries(draft.ticket_prices || {}) as [
      string,
      {
        name: string
        price: number
        quantity: number
        ticket_format?: 'digital' | 'physical' | 'both'
        fee_payer?: 'buyer' | 'promoter' | null
        printing_quantity?: number | null
        rtny_distribution?: boolean
      }
    ][]
    const totalTickets = ticketPriceEntries.reduce(
      (sum, [, tt]) => sum + (Number(tt.quantity) || 0),
      0
    )

    // 1. Publish to events table (draft status stays 'pending_review' until this
    // and the ticket_types insert below both succeed)
    const { data: publishedEvent, error: publishError } = await supabase
      .from('events')
      .insert({
        name: draft.name,
        description: draft.description || '',
        category: draft.category || 'nightlife',
        event_date: draft.event_date,
        event_end_date: draft.event_end_date || null,
        theme_id: draft.theme_id || null,
        theme_custom_text: draft.theme_custom_text || null,
        venue_id: draft.venue_id,
        custom_address: draft.venue_name || null,
        flyer_image_url: draft.flyer_image_url,
        ticket_prices: draft.ticket_prices,
        tier_discounts: draft.tier_discounts,
        total_tickets: totalTickets,
        tickets_sold: 0,
        status: 'active',
        featured: false,
        sale_start_date: draft.sale_start_date || new Date().toISOString(),
        sale_end_date: draft.sale_end_date || draft.event_date,
        age_restriction: draft.age_restriction || '18+',
        parking_info: draft.parking_info || null,
        refund_policy: draft.refund_policy || 'No refunds',
      })
      .select()
      .single()

    if (publishError) {
      console.error('Failed to publish event:', publishError)
      return NextResponse.json(
        { error: 'Failed to publish event', details: publishError.message },
        { status: 500 }
      )
    }

    // 2. Insert one ticket_types row per entry in draft.ticket_prices
    const needsPrintingCost = ticketPriceEntries.some(
      ([, tt]) =>
        (tt.ticket_format === 'physical' || tt.ticket_format === 'both') &&
        tt.printing_quantity != null
    )

    let printingRateCents: number | null = null
    if (needsPrintingCost) {
      const { data: rateSetting, error: rateError } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'printing_rate_cents_per_ticket')
        .single()

      if (rateError || !rateSetting) {
        console.error('Failed to fetch printing rate, rolling back published event:', rateError)
        const { error: rollbackError } = await supabase
          .from('events')
          .delete()
          .eq('id', publishedEvent.id)

        if (rollbackError) {
          console.error('Failed to roll back published event after printing rate lookup failure:', rollbackError)
        }

        return NextResponse.json(
          { error: 'Failed to fetch printing rate for cost estimation' },
          { status: 500 }
        )
      }

      printingRateCents = parseInt(rateSetting.value, 10)
    }

    const ticketTypeRows = ticketPriceEntries.map(([, tt]) => {
      const ticketFormat = tt.ticket_format ?? 'digital'
      const printingQuantity = tt.printing_quantity ?? null
      const estimatedPrintingCostCents =
        (ticketFormat === 'physical' || ticketFormat === 'both') &&
        printingQuantity != null &&
        printingRateCents != null
          ? printingQuantity * printingRateCents
          : null

      return {
        event_id: publishedEvent.id,
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
        remaining: tt.quantity,
        description: null,
        ticket_format: ticketFormat,
        fee_payer: tt.fee_payer ?? null,
        printing_quantity: printingQuantity,
        estimated_printing_cost_cents: estimatedPrintingCostCents,
        rtny_distribution: tt.rtny_distribution ?? false,
      }
    })

    const { error: ticketTypesError } = await supabase
      .from('ticket_types')
      .insert(ticketTypeRows)

    if (ticketTypesError) {
      console.error('Failed to create ticket types, rolling back published event:', ticketTypesError)
      const { error: rollbackError } = await supabase
        .from('events')
        .delete()
        .eq('id', publishedEvent.id)

      if (rollbackError) {
        console.error('Failed to roll back published event after ticket_types failure:', rollbackError)
      }

      return NextResponse.json(
        { error: 'Failed to create ticket types', details: ticketTypesError.message },
        { status: 500 }
      )
    }

    // 3. Only now mark the draft approved — both inserts succeeded
    const { error: updateError } = await supabase
      .from('event_drafts')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      // Event is live and has ticket types; only the draft's status is stale.
      console.error('Event published successfully but failed to update draft status:', updateError)
      return NextResponse.json({
        success: true,
        data: publishedEvent,
        message: 'Event approved and published, but the draft status failed to update — it may still show as pending review.'
      })
    }

    // TODO: Send approval email
    // Get promoter email from user_id
    // const { data: { user } } = await supabase.auth.admin.getUserById(draft.user_id)
    // if (user?.email) {
    //   const { sendEventApprovalEmail } = await import('@/lib/email-notifications')
    //   await sendEventApprovalEmail(user.email, draft.name, publishedEvent.id)
    //     .catch(err => console.error('⚠️ Failed to send email:', err))
    // }

    return NextResponse.json({
      success: true,
      data: publishedEvent,
      message: 'Event approved and published successfully'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}