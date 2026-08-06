import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'

export async function GET() {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const supabase = createSupabaseAdmin()

    const { data, error } = await supabase
      .from('ad_reel_duration_options')
      .select('key, label, price_cents, billing_period')
      .eq('is_active', true)
      .order('price_cents', { ascending: true })

    if (error) {
      console.error('admin/ad-reel-durations GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch reel durations' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('admin/ad-reel-durations GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch reel durations' }, { status: 500 })
  }
}
