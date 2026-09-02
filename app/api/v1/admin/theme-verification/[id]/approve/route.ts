import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// POST /api/v1/admin/theme-verification/[id]/approve - [id] is the partner_media row id
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
        { error: 'Only pending photos can be approved' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('partner_media')
      .update({ photo_review_status: 'approved' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to approve photo', details: error.message },
        { status: 500 }
      )
    }

    // First approval on the parent tag wins permanently. If the tag has
    // already been approved by an earlier photo, leave it untouched — a
    // second photo being approved later shouldn't reset first_approved_at.
    if (media.theme_tag_id) {
      const { data: tag, error: tagFetchError } = await supabase
        .from('partner_theme_tags')
        .select('id, first_approved_at')
        .eq('id', media.theme_tag_id)
        .single()

      if (tagFetchError) {
        console.error('partner_theme_tags fetch error:', tagFetchError)
      } else if (tag && !tag.first_approved_at) {
        const { error: tagUpdateError } = await supabase
          .from('partner_theme_tags')
          .update({
            status: 'approved',
            first_approved_at: new Date().toISOString(),
          })
          .eq('id', tag.id)

        if (tagUpdateError) {
          console.error('partner_theme_tags update error:', tagUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Photo approved'
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
