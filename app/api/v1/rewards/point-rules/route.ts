import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('point_rules')
    .select('reason, points')
    .eq('active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    map[row.reason] = row.points
  }

  return NextResponse.json({ success: true, data: map })
}
