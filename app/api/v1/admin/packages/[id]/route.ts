import { NextRequest } from 'next/server'
import { CAPABILITIES, requireAdmin, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, fetchAllRows, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { validatePackagePatch } from '@/lib/package-validation'

const PKG_COLUMNS = 'id, key, occasion, status, theme_id, live_version_id, created_by, created_at, updated_at'
const FEED_CARD_CAP = 50

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid package id')

    const supabase = createSupabaseAdmin()
    const [pkgRes, versions] = await Promise.all([
      supabase.from('theme_packages').select(PKG_COLUMNS).eq('id', id).maybeSingle(),
      fetchAllRows<{ id: string }>((from, to) =>
        supabase.from('theme_package_versions')
          .select('id, version_number, status, title, revision, updated_at, reviewed_at, review_note')
          .eq('package_id', id).order('version_number', { ascending: false }).range(from, to)),
    ])
    if (pkgRes.error) return mapDbError(pkgRes.error, 'packages/[id] GET package')
    if (versions.error) return mapDbError(versions.error, 'packages/[id] GET versions')
    if (!pkgRes.data) return fail(404, 'Package not found')

    let themeName: string | null = null
    if (pkgRes.data.theme_id) {
      const { data: theme, error } = await supabase
        .from('themes').select('name').eq('id', pkgRes.data.theme_id).maybeSingle()
      if (error) return mapDbError(error, 'packages/[id] GET theme')
      themeName = theme?.name ?? null
    }

    return ok({ package: { ...pkgRes.data, theme_name: themeName }, versions: versions.data ?? [] })
  } catch (err) {
    return mapDbError(err, 'packages/[id] GET')
  }
}

// Archive / reactivate only. Everything else on a package is immutable from routes.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid package id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validatePackagePatch(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('theme_packages').update({ status: v.value.status }).eq('id', id).select(PKG_COLUMNS).maybeSingle()
    if (error) return mapDbError(error, 'packages/[id] PATCH')
    if (!data) return fail(404, 'Package not found')

    if (v.value.status !== 'archived') return ok({ package: data })

    // Archiving does not touch feed cards. Tell the admin how many active ones still feature this
    // package (capped). A failed read must never fail the archive that already succeeded.
    let activeFeedCards: number | null = null
    try {
      const { data: cards, error: feedErr } = await supabase
        .from('feed_cards').select('id').eq('theme_package_id', id).eq('active', true).limit(FEED_CARD_CAP)
      if (feedErr) {
        console.error('[packages] archive: feed card read failed', feedErr.code ?? '', feedErr.message)
      } else {
        activeFeedCards = Math.min((cards ?? []).length, FEED_CARD_CAP)
      }
    } catch (feedThrown) {
      console.error('[packages] archive: feed card read threw', feedThrown)
    }

    return ok({ package: data, active_feed_cards: activeFeedCards })
  } catch (err) {
    return mapDbError(err, 'packages/[id] PATCH')
  }
}
