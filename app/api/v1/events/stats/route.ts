// app/api/v1/events/stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get category counts
    const { data: events, error } = await supabase
      .from('events')
      .select('category')
      .eq('status', 'active')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch event stats' },
        { status: 500 }
      )
    }

    // Count events by category
    const counts = (events || []).reduce<Record<string, number>>((acc, event) => {
      const category = event.category as string
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      counts,
      total: events?.length || 0
    })

  } catch (error: any) {
    console.error('Error fetching event stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event stats' },
      { status: 500 }
    )
  }
}
