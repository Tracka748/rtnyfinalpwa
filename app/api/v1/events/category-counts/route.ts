import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseAdmin()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('events')
    .select('category')
    .eq('status', 'active')
    .gte('event_date', todayStart.toISOString())
    .lte('event_date', todayEnd.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.category) {
      counts[row.category] = (counts[row.category] || 0) + 1
    }
  }

  return NextResponse.json({ success: true, data: counts })
}
