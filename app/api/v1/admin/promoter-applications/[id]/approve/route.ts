import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/promoter-applications/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const supabase = createSupabaseAdmin()
    const { id } = await params

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
        { error: 'Only pending applications can be approved' },
        { status: 400 }
      )
    }

    // Update status to approved
    const { data, error } = await supabase
      .from('promoter_applications')
      .update({
        status: 'approved',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to approve application', details: error.message },
        { status: 500 }
      )
    }

    // TODO: Send approval email here
    // const { sendPromoterApprovalEmail } = await import('@/lib/email-notifications')
    // await sendPromoterApprovalEmail(application.contact_email, application.business_name)
    //   .catch(err => console.error('⚠️ Failed to send email:', err))

    // Update user's profile role to promoter
    await supabase
      .from('profiles')
      .update({ role: 'promoter' })
      .eq('id', application.user_id);

    // Create promoters row if it doesn't exist
    const { data: existingPromoter } = await supabase
      .from('promoters')
      .select('id')
      .eq('user_id', application.user_id)
      .maybeSingle();

    if (!existingPromoter) {
      await supabase
        .from('promoters')
        .insert({
          user_id: application.user_id,
          display_name: application.business_name,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Promoter application approved successfully'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}