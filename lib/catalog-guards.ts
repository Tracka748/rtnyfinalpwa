// Guards that stop catalog changes from silently breaking live theme packages.
// Archiving an item or rejecting a link that an approved package version still uses would
// make future requests for that package fail at snapshot time (tp_check_option_fulfillable).

import { fetchAllRows, type AdminClient } from '@/lib/catalog-api'

export const IN_CHUNK = 200
export const MAX_TITLES = 5

export interface LivePackageUse { package_id: string; title: string }

export type LiveUsageResult =
  | { ok: true; uses: LivePackageUse[] }
  | { ok: false; error: { code: string; message: string } }

export function chunk<T>(items: readonly T[], size: number = IN_CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function formatLiveUseMessage(uses: readonly LivePackageUse[], subject: 'item' | 'service link'): string {
  const sorted = [...uses].sort((a, b) => a.title.localeCompare(b.title))
  const n = sorted.length
  const shown = sorted.slice(0, MAX_TITLES).map(u => `"${u.title}"`).join(', ')
  const more = n > MAX_TITLES ? ` and ${n - MAX_TITLES} more` : ''
  const what = subject === 'item' ? 'This catalog item' : 'This service link'
  const without = subject === 'item' ? 'without this item' : 'without this service'
  return (
    `${what} is used by ${n} live ${n === 1 ? 'package' : 'packages'}: ${shown}${more}. ` +
    `Publish a new version ${n === 1 ? 'of that package' : 'of each package'} ${without} first, then try again.`
  )
}

// A non-Postgres code on purpose: mapDbError turns it into a generic 500 (fail closed),
// while the original code and message still reach the server log.
function guardError(step: string, err: unknown) {
  const e = (err ?? {}) as { code?: string; message?: string }
  return {
    code: 'GUARD',
    message: `live-package check failed at ${step}: ${e.code ?? ''} ${e.message ?? String(err)}`.trim(),
  }
}

/**
 * Finds approved theme package versions whose components use the item (and, for a link check,
 * the specific service). Three simple queries, no joins, every .in() list chunked to IN_CHUNK.
 * Any query error or exception returns { ok: false } so the caller must not perform the change.
 */
export async function findLivePackageUsage(
  supabase: AdminClient,
  target: { catalogItemId: string; serviceId?: string }
): Promise<LiveUsageResult> {
  try {
    const options = await fetchAllRows<{ component_id: string }>((from, to) => {
      let q = supabase
        .from('theme_package_component_options')
        .select('component_id')
        .eq('catalog_item_id', target.catalogItemId)
      if (target.serviceId) q = q.eq('service_id', target.serviceId)
      return q.order('id').range(from, to)
    })
    if (options.error) return { ok: false, error: guardError('options', options.error) }
    const componentIds = [...new Set((options.data ?? []).map(r => r.component_id))]
    if (componentIds.length === 0) return { ok: true, uses: [] }

    const compResults = await Promise.all(
      chunk(componentIds).map(ids =>
        supabase.from('theme_package_components').select('version_id').in('id', ids)
      )
    )
    const compFailed = compResults.find(r => r.error)
    if (compFailed) return { ok: false, error: guardError('components', compFailed.error) }
    const versionIds = [
      ...new Set(
        compResults.flatMap(r => (r.data ?? []).map((c: { version_id: string }) => c.version_id))
      ),
    ]
    if (versionIds.length === 0) return { ok: true, uses: [] }

    const verResults = await Promise.all(
      chunk(versionIds).map(ids =>
        supabase
          .from('theme_package_versions')
          .select('id, package_id, title')
          .in('id', ids)
          .eq('status', 'approved')
      )
    )
    const verFailed = verResults.find(r => r.error)
    if (verFailed) return { ok: false, error: guardError('versions', verFailed.error) }

    const byPackage = new Map<string, LivePackageUse>()
    for (const r of verResults) {
      for (const v of (r.data ?? []) as { package_id: string; title: string }[]) {
        byPackage.set(v.package_id, { package_id: v.package_id, title: v.title })
      }
    }
    const uses = [...byPackage.values()].sort((a, b) => a.title.localeCompare(b.title))
    return { ok: true, uses }
  } catch (err) {
    return { ok: false, error: guardError('exception', err) }
  }
}
