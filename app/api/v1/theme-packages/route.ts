import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { PUBLIC_PAGE } from '@/lib/theme-package-public-api'
import { projectCard } from '@/lib/theme-package-public'
import { validateLiveListQuery } from '@/lib/theme-package-public-validation'

export const dynamic = 'force-dynamic'

const CARD_COLUMNS = 'id, package_id, title, subtitle, cover_image_url, price_note, min_guests, max_guests'

interface PackageRow { id: string; key: string; occasion: string; theme_id: string | null; live_version_id: string | null }
interface VersionRow {
  id: string; package_id: string; title: string; subtitle: string | null; cover_image_url: string | null
  price_note: string | null; min_guests: number | null; max_guests: number | null
}

// Public: live approved versions of active packages only.
export async function GET(request: NextRequest) {
  try {
    const q = validateLiveListQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)
    const { offset, occasion, theme_id } = q.value

    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('theme_packages')
      .select('id, key, occasion, theme_id, live_version_id')
      .eq('status', 'active')
      .not('live_version_id', 'is', null)
      .order('key')
      .order('id')
      .range(offset, offset + PUBLIC_PAGE) // PUBLIC_PAGE + 1 rows: the extra one tells us there is more
    if (occasion) query = query.eq('occasion', occasion)
    if (theme_id) query = query.eq('theme_id', theme_id)

    const { data: rows, error } = await query
    if (error) return mapDbError(error, 'theme-packages GET')

    const hasMore = (rows?.length ?? 0) > PUBLIC_PAGE
    const nextOffset = hasMore ? offset + PUBLIC_PAGE : null
    const packages: PackageRow[] = (rows ?? []).slice(0, PUBLIC_PAGE)
    if (packages.length === 0) return ok({ packages: [], has_more: false, next_offset: null })

    const liveIds = packages.map(p => p.live_version_id).filter((x): x is string => !!x)
    const themeIds = [...new Set(packages.map(p => p.theme_id).filter((x): x is string => !!x))]
    const [versions, themes] = await Promise.all([
      supabase.from('theme_package_versions').select(CARD_COLUMNS).in('id', liveIds).eq('status', 'approved'),
      themeIds.length
        ? supabase.from('themes').select('id, name').in('id', themeIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    ])
    const aggError = versions.error ?? themes.error
    if (aggError) return mapDbError(aggError, 'theme-packages GET aggregate')

    const versionById = new Map<string, VersionRow>((versions.data ?? []).map((v: VersionRow) => [v.id, v]))
    const themeById = new Map<string, { id: string; name: string }>((themes.data ?? []).map((t: { id: string; name: string }) => [t.id, t]))

    const cards = packages.flatMap(p => {
      const v = p.live_version_id ? versionById.get(p.live_version_id) : undefined
      if (!v || v.package_id !== p.id) return [] // live pointer must be an approved version of this package
      return [projectCard({ pkg: p, theme: p.theme_id ? themeById.get(p.theme_id) ?? null : null, version: v })]
    })

    return ok({ packages: cards, has_more: hasMore, next_offset: nextOffset })
  } catch (err) {
    return mapDbError(err, 'theme-packages GET')
  }
}
