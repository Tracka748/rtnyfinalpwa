import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createSupabaseAdmin()

    const { data: filters, error: filtersError } = await supabase
      .from('filters')
      .select('id, name, asset_url, points_cost, partners (id, display_name, logo_url)')
      .eq('event_id', id)
      .eq('is_active', true)

    if (filtersError) {
      console.error('filters fetch error:', filtersError)
      return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 })
    }

    let unlockedFilterIds = new Set<string>()

    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (user && filters && filters.length > 0) {
      const { data: unlocks, error: unlocksError } = await supabase
        .from('user_filter_unlocks')
        .select('filter_id')
        .eq('user_id', user.id)
        .in('filter_id', filters.map((f) => f.id))

      if (unlocksError) {
        console.error('user_filter_unlocks fetch error:', unlocksError)
      } else {
        unlockedFilterIds = new Set((unlocks ?? []).map((u) => u.filter_id))
      }
    }

    const data = (filters ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      asset_url: f.asset_url,
      points_cost: f.points_cost,
      partner: f.partners,
      unlocked: unlockedFilterIds.has(f.id),
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('events/[id]/filters GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 })
  }
}
