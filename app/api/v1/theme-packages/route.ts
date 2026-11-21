import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { listLiveCards } from '@/lib/theme-package-public-api'
import { validateLiveListQuery } from '@/lib/theme-package-public-validation'

export const dynamic = 'force-dynamic'

// Public: live approved versions of active packages only.
export async function GET(request: NextRequest) {
  try {
    const q = validateLiveListQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)

    const supabase = createSupabaseAdmin()
    return ok(await listLiveCards(supabase, q.value))
  } catch (err) {
    return mapDbError(err, 'theme-packages GET')
  }
}
