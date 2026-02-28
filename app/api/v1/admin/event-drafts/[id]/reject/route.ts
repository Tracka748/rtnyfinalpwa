import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/event-drafts/[id]/reject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const supabase = createSupabaseAdmin()
    const { id } = await params

    // Check if draft exists and is pending
    const { data: draft, error: fetchError } = await supabase
      .from('event_drafts')
      .select('*')
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
        { error: 'Only pending events can be rejected' },
        { status: 400 }
      )
    }

    // Update status to rejected
    const { data, error } = await supabase
      .from('event_drafts')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to reject event', details: error.message },
        { status: 500 }
      )
    }

    // TODO: Send rejection email
    // Get promoter email from user_id
    // const { data: { user } } = await supabase.auth.admin.getUserById(draft.user_id)
    // if (user?.email) {
    //   const { sendEventRejectionEmail } = await import('@/lib/email-notifications')
    //   await sendEventRejectionEmail(user.email, draft.name)
    //     .catch(err => console.error('⚠️ Failed to send email:', err))
    // }

    return NextResponse.json({
      success: true,
      data,
      message: 'Event draft rejected'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}