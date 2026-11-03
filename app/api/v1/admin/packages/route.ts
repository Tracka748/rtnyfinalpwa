import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, fetchAllRows, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { validateCreatePackage, validatePackageListQuery } from '@/lib/package-validation'

const PKG_COLUMNS = 'id, key, occasion, status, theme_id, live_version_id, created_by, created_at, updated_at'
const OPEN = ['draft', 'in_review', 'needs_changes']
const PAGE = 200

interface PackageRow { id: string; theme_id: string | null; live_version_id: string | null }
interface VersionSummary {
  id: string; package_id: string; version_number: number; status: string; revision: number; title: string
}

export async function GET(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const q = validatePackageListQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)
    const { offset } = q.value

    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('theme_packages')
      .select(PKG_COLUMNS)
      .order('key')
      .order('id')
      .range(offset, offset + PAGE) // PAGE + 1 rows: the extra one tells us there is more
    if (q.value.status) query = query.eq('status', q.value.status)

    const { data: rows, error } = await query
    if (error) return mapDbError(error, 'packages GET')

    const hasMore = (rows?.length ?? 0) > PAGE
    const nextOffset = hasMore ? offset + PAGE : null
    const packages: PackageRow[] = (rows ?? []).slice(0, PAGE)
    if (packages.length === 0) return ok({ packages: [], has_more: false, next_offset: null })
    const ids = packages.map(p => p.id)

    const [versionRows, themeList] = await Promise.all([
      fetchAllRows<VersionSummary>((from, to) =>
        supabase.from('theme_package_versions')
          .select('id, package_id, version_number, status, revision, title')
          .in('package_id', ids).order('id').range(from, to)),
      supabase.from('themes').select('id, name'),
    ])
    const aggError = versionRows.error ?? themeList.error
    if (aggError) return mapDbError(aggError, 'packages GET aggregate')

    const themeName = new Map<string, string>((themeList.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
    const byPackage = new Map<string, VersionSummary[]>()
    for (const v of versionRows.data ?? []) {
      const list = byPackage.get(v.package_id) ?? []
      list.push(v)
      byPackage.set(v.package_id, list)
    }

    return ok({
      packages: packages.map(p => {
        const versions = byPackage.get(p.id) ?? []
        const live = versions.find(v => v.id === p.live_version_id)
        const open = versions.find(v => OPEN.includes(v.status))
        return {
          ...p,
          theme_name: p.theme_id ? themeName.get(p.theme_id) ?? null : null,
          live_version: live ? { id: live.id, version_number: live.version_number, title: live.title } : null,
          open_version: open ? { id: open.id, status: open.status, revision: open.revision, title: open.title } : null,
          version_count: versions.length,
        }
      }),
      has_more: hasMore,
      next_offset: nextOffset,
    })
  } catch (err) {
    return mapDbError(err, 'packages GET')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_MANAGE, 'allow')
  if (auth.error) return auth.response

  try {
    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateCreatePackage(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()

    if (v.value.theme_id) {
      const { data: theme, error: themeErr } = await supabase
        .from('themes').select('id').eq('id', v.value.theme_id).eq('active', true).maybeSingle()
      if (themeErr) return mapDbError(themeErr, 'packages POST theme')
      if (!theme) return fail(400, 'Theme does not exist or is inactive')
    }

    // created_by comes only from the verified session.
    const { data: pkg, error: pkgErr } = await supabase
      .from('theme_packages')
      .insert({ key: v.value.key, occasion: v.value.occasion, theme_id: v.value.theme_id, created_by: auth.userId })
      .select('id')
      .single()
    if (pkgErr) return mapDbError(pkgErr, 'packages POST package')

    // The DB assigns version_number and enforces draft-only / active-package rules.
    const { data: version, error: verErr } = await supabase
      .from('theme_package_versions')
      .insert({ package_id: pkg.id, title: v.value.title, created_by: auth.userId, updated_by: auth.userId })
      .select('id, revision')
      .single()
    if (verErr) {
      // Compensating delete: no version means no audit event, so the package can be removed.
      const { error: delErr } = await supabase.from('theme_packages').delete().eq('id', pkg.id)
      if (delErr) console.error('[packages] compensating delete failed, orphan package', pkg.id, delErr.code ?? '', delErr.message)
      return mapDbError(verErr, 'packages POST version')
    }

    return ok({ package_id: pkg.id, version_id: version.id, revision: version.revision }, 201)
  } catch (err) {
    return mapDbError(err, 'packages POST')
  }
}
