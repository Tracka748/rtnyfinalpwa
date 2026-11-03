// I/O helpers for theme packages in the feed. Database errors are thrown as-is so callers decide
// how to handle them (the feed route drops package cards; the admin route maps them).

import type { AdminClient } from '@/lib/catalog-api'
import { chunk } from '@/lib/catalog-guards'
import { isPackageLive, toFeedPackageInfo, type FeedPackageInfo } from '@/lib/feed-package-cards'

interface PackageRow { id: string; key: string; occasion: string; status: string; live_version_id: string | null }
interface VersionRow {
  id: string; package_id: string; status: string; title: string; subtitle: string | null
  cover_image_url: string | null; price_note: string | null; min_guests: number | null; max_guests: number | null
}

/**
 * The live packages among `ids`, keyed by package id. One query for the packages and one for their
 * live versions (per chunk of 200), never one per card. Ids that are not live are simply absent.
 */
export async function loadLivePackagesByIds(supabase: AdminClient, ids: string[]): Promise<Map<string, FeedPackageInfo>> {
  const out = new Map<string, FeedPackageInfo>()
  const unique = [...new Set(ids)]
  if (unique.length === 0) return out

  const packagePages = await Promise.all(
    chunk(unique).map(c =>
      supabase.from('theme_packages').select('id, key, occasion, status, live_version_id')
        .in('id', c).eq('status', 'active').not('live_version_id', 'is', null))
  )
  const packageErr = packagePages.find(p => p.error)
  if (packageErr) throw packageErr.error
  const packages: PackageRow[] = packagePages.flatMap(p => (p.data ?? []) as PackageRow[])

  const liveVersionIds = packages.map(p => p.live_version_id).filter((x): x is string => !!x)
  const versionPages = await Promise.all(
    chunk(liveVersionIds).map(c =>
      supabase.from('theme_package_versions')
        .select('id, package_id, status, title, subtitle, cover_image_url, price_note, min_guests, max_guests')
        .in('id', c).eq('status', 'approved'))
  )
  const versionErr = versionPages.find(p => p.error)
  if (versionErr) throw versionErr.error
  const versionById = new Map<string, VersionRow>(
    versionPages.flatMap(p => (p.data ?? []) as VersionRow[]).map(v => [v.id, v])
  )

  for (const p of packages) {
    const v = p.live_version_id ? versionById.get(p.live_version_id) : undefined
    if (v && isPackageLive(p, v)) out.set(p.id, toFeedPackageInfo(p, v))
  }
  return out
}

/** The trigger's rule for attaching: the package exists, is active and has a live version. */
export async function isPackageFeaturable(supabase: AdminClient, packageId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('theme_packages').select('id, status, live_version_id').eq('id', packageId).maybeSingle()
  if (error) throw error
  return !!data && data.status === 'active' && !!data.live_version_id
}
