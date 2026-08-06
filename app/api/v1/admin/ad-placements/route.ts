import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

export async function GET() {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('ad_placement_options')
      .select('key, label, price_cents, billing_period')
      .eq('is_active', true)
      .order('label', { ascending: true })

    if (error) {
      console.error('admin/ad-placements GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch ad placements' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('admin/ad-placements GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch ad placements' }, { status: 500 })
  }
}
