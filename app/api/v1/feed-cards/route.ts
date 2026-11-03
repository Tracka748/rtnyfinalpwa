import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { applyLivePackages, type FeedCardRow, type FeedPackageInfo } from '@/lib/feed-package-cards'
import { loadLivePackagesByIds } from '@/lib/feed-package-cards-api'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('feed_cards')
      .select('id, type, headline, sub, action_label, cta_url, event_id, promo_code, image_url, theme_package_id')
      .eq('active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true })
      .limit(8)

    if (error) {
      console.error('feed-cards GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
    }

    const rows: FeedCardRow[] = data ?? []

    // Cards that point at a theme package are checked at read time with the same rule as the public
    // package routes; a package that is no longer live drops its cards (no cleanup job needed).
    // If that lookup fails, package cards are dropped and every other card is returned as before.
    const packageIds = rows.flatMap(r => (r.theme_package_id ? [r.theme_package_id] : []))
    let live = new Map<string, FeedPackageInfo>()
    if (packageIds.length > 0) {
      try {
        live = await loadLivePackagesByIds(supabase, packageIds)
      } catch (packageErr) {
        console.error('feed-cards GET package lookup error:', packageErr)
      }
    }

    return NextResponse.json(applyLivePackages(rows, live))
  } catch (err) {
    console.error('feed-cards GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed cards' }, { status: 500 })
  }
}
