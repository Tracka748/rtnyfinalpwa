import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// GET /api/v1/admin/theme-verification - List theme-tag photo-proof submissions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'pending'

    let query = supabase
      .from('partner_media')
      .select(`
        *,
        partners (
          display_name
        ),
        partner_theme_tags (
          theme_id,
          partner_id,
          themes (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('photo_review_status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch theme verification photos', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
