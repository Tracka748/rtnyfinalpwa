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

    // 1. Update draft status to approved
    const { error: updateError } = await supabase
      .from('event_drafts')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update draft:', updateError)
      return NextResponse.json(
        { error: 'Failed to update draft status' },
        { status: 500 }
      )
    }

    // 2. Publish to events table
    const { data: publishedEvent, error: publishError } = await supabase
      .from('events')
      .insert({
        name: draft.name,
        description: draft.description,
        category: draft.category || 'nightlife',
        event_date: draft.event_date,
        venue_id: draft.venue_id,
        flyer_image_url: draft.flyer_image_url,
        ticket_prices: draft.ticket_prices,
        tier_discounts: draft.tier_discounts,
        total_tickets: draft.total_tickets || 100,
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