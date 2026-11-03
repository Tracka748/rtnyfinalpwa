import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { projectSnapshot } from '@/lib/theme-package-public'
import { resolveLivePackage } from '@/lib/theme-package-public-api'
import { isSlugKey, validatePreviewBody } from '@/lib/theme-package-public-validation'

// Public, read-only. Pricing comes only from theme_package_build_snapshot; the client sends only a
// selection, guest count and date. The snapshot is returned through a public projection.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    if (!isSlugKey(key)) return fail(404, 'Package not found')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validatePreviewBody(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const live = await resolveLivePackage(supabase, key)
    if (!live) return fail(404, 'Package not found')

    const { data, error } = await supabase.rpc('theme_package_build_snapshot', {
      p_version_id: live.version.id,
      p_selection: v.value.selection,
      p_guest_count: v.value.guest_count,
      p_event_date: v.value.event_date,
    })
    if (error) return mapDbError(error, 'theme-packages/[key]/preview POST') // P0001 -> 400 with the DB message

    const snapshot = projectSnapshot(data)
    if (!snapshot) return fail(500, 'Something went wrong')
    return ok(snapshot)
  } catch (err) {
    return mapDbError(err, 'theme-packages/[key]/preview POST')
  }
}
