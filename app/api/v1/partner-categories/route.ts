import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/v1/partner-categories - Get partner categories for dropdown
// GET /api/v1/partner-categories?partner_type=venue - filtered by partner type
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const partnerType = new URL(request.url).searchParams.get('partner_type')

    let query = supabase
      .from('partner_categories')
      .select('id, name')
      .eq('active', true)

    if (partnerType) {
      query = query.eq('partner_type', partnerType)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch partner categories', details: error.message },
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
