import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/promoter-applications/[id]/reject
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer()

    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const { id } = params

    // Check if application exists and is pending
    const { data: application, error: fetchError } = await supabase
      .from('promoter_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending applications can be rejected' },
        { status: 400 }
      )
    }

    // Update status to rejected
    const { data, error } = await supabase
      .from('promoter_applications')
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
        { error: 'Failed to reject application', details: error.message },
        { status: 500 }
      )
    }

    // TODO: Send rejection email here
    // const { sendPromoterRejectionEmail } = await import('@/lib/email-notifications')
    // await sendPromoterRejectionEmail(application.contact_email, application.business_name)
    //   .catch(err => console.error('⚠️ Failed to send email:', err))

    return NextResponse.json({
      success: true,
      data,
      message: 'Promoter application rejected'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}