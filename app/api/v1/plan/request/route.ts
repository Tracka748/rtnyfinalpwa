import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type PlanRequestInsert = Database['public']['Tables']['plan_requests']['Insert']

interface RequestBody {
  event_type: string
  event_date: string | null
  time_start: string | null
  time_end: string | null
  budget_range: string | null
  guest_count: string | null
  has_venue: boolean | null
  selected_service_ids: string[]
  selected_package_id: string | null
  estimated_total: number | null
  needs: string[]
  notes: string | null
  contact_email: string | null
}

async function sendPlanRequestEmail(params: {
  requestId: string
  eventType: string
  eventDate: string | null
  guestCount: string | null
  budgetRange: string | null
  estimatedTotal: number | null
  notes: string | null
  contactEmail: string | null
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const from = process.env.RESEND_FROM_EMAIL
    ? `RTNY Planning <${process.env.RESEND_FROM_EMAIL}>`
    : 'RTNY Planning <onboarding@resend.dev>'

  const { data, error } = await resend.emails.send({
    from,
    to: 'hello@rocticketny.com',
    subject: `New Plan Request — ${params.eventType}`,
    html: `
      <h2>New Plan My Event Submission</h2>
      <p><strong>Request ID:</strong> ${params.requestId}</p>
      <p><strong>Event Type:</strong> ${params.eventType}</p>
      <p><strong>Event Date:</strong> ${params.eventDate ?? 'Not specified'}</p>
      <p><strong>Guest Count:</strong> ${params.guestCount ?? 'Not specified'}</p>
      <p><strong>Budget Range:</strong> ${params.budgetRange ?? 'Not specified'}</p>
      <p><strong>Estimated Total:</strong> ${params.estimatedTotal ? '$' + params.estimatedTotal : 'Not specified'}</p>
      <p><strong>Contact Email:</strong> ${params.contactEmail ?? 'Not provided'}</p>
      <p><strong>Notes:</strong> ${params.notes ?? 'None'}</p>
      <hr />
      <p>View all plan requests in the <a href="https://rocticketny.com/admin">RTNY Admin Dashboard</a></p>
    `
  })

  if (error) {
    console.error('Resend email error:', error)
    throw new Error(error.message)
  }

  console.log('Plan request email sent:', data?.id)
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    const {
      event_type,
      event_date,
      time_start,
      time_end,
      budget_range,
      guest_count,
      has_venue,
      selected_service_ids,
      selected_package_id,
      estimated_total,
      needs,
      notes,
      contact_email,
    } = body

    if (!event_type?.trim()) {
      return NextResponse.json(
        { success: false, error: 'event_type is required' },
        { status: 400 }
      )
    }

    // Attempt to resolve authenticated user — anonymous submissions are allowed
    let userId: string | null = null
    try {
      const serverClient = await createClient()
      const { data: { user } } = await serverClient.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // No session cookie present — continue as anonymous
    }

    const supabase = createSupabaseAdmin()

    const payload: PlanRequestInsert = {
      event_type: event_type.trim(),
      event_date: event_date ?? null,
      time_start: time_start ?? null,
      time_end: time_end ?? null,
      budget_range: budget_range ?? null,
      guest_count: guest_count ?? null,
      has_venue: has_venue ?? null,
      selected_service_ids: Array.isArray(selected_service_ids) ? selected_service_ids : [],
      selected_package_id: selected_package_id ?? null,
      estimated_total: estimated_total ?? null,
      needs: Array.isArray(needs) ? needs : [],
      notes: notes ?? null,
      contact_email: contact_email ?? null,
      user_id: userId,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('plan_requests')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('plan_requests insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to submit plan request', details: error.message },
        { status: 500 }
      )
    }

    // Fire-and-forget admin notification
    sendPlanRequestEmail({
      requestId: data.id,
      eventType: event_type,
      eventDate: event_date,
      guestCount: guest_count,
      budgetRange: budget_range,
      estimatedTotal: estimated_total,
      notes: notes,
      contactEmail: contact_email,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: { id: data.id } }, { status: 201 })
  } catch (err: any) {
    console.error('plan/request route error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
