import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/v1/themes - Get all active themes for dropdown
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('themes')
      .select('id, name')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch themes', details: error.message },
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
