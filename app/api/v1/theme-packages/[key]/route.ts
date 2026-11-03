import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { loadLiveDocument, resolveLivePackage } from '@/lib/theme-package-public-api'
import { isSlugKey } from '@/lib/theme-package-public-validation'

export const dynamic = 'force-dynamic'

const notFound = () => fail(404, 'Package not found')

// Public. Invalid, unknown, archived and not-live keys all get the same 404, so keys cannot be probed.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    if (!isSlugKey(key)) return notFound()

    const supabase = createSupabaseAdmin()
    const live = await resolveLivePackage(supabase, key)
    if (!live) return notFound()

    return ok(await loadLiveDocument(supabase, live))
  } catch (err) {
    return mapDbError(err, 'theme-packages/[key] GET')
  }
}
