import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/theme-verification/[id]/reject - [id] is the partner_media row id
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const supabase = createSupabaseAdmin()
    const { id } = await params

    const { data: media, error: fetchError } = await supabase
      .from('partner_media')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !media) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    if (media.photo_review_status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending photos can be rejected' },
        { status: 400 }
      )
    }

    // Parent partner_theme_tags row is intentionally left untouched — other
    // photos under the same tag might still be pending or already approved.
    const { data, error } = await supabase
      .from('partner_media')
      .update({ photo_review_status: 'rejected' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to reject photo', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Photo rejected'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
