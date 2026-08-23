import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const PRINTING_RATE_KEY = 'printing_rate_cents_per_ticket'

// GET /api/v1/settings/printing-rate - Public read-only printing rate lookup
export async function GET() {
  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', PRINTING_RATE_KEY)
      .single()

    if (error || !data) {
      console.error('Failed to fetch printing rate:', error)
      return NextResponse.json({ error: 'Failed to fetch printing rate' }, { status: 500 })
    }

    return NextResponse.json({ rate_cents: parseInt(data.value, 10) })
  } catch (error) {
    console.error('Server error fetching printing rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
