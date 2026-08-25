import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

// GET /api/v1/admin/event-drafts - List all event drafts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const adminCheck = await checkIsAdmin()
    if (adminCheck.error) return adminCheck.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('event_drafts')
      .select(`
        *,
        venues (
          name,
          address
        ),
        themes (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch event drafts', details: error.message },
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