import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, loadOwnerNames, mapDbError, ok } from '@/lib/catalog-api'
import { escapeLike, validateEligibleQuery } from '@/lib/catalog-validation'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const q = validateEligibleQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)

    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('vendor_services')
      .select('id, title, category, price, pricing_model, status, partner_id, vendor_id')
      .eq('status', 'active')
      // pricing_model is nullable; a plain NOT IN would silently drop NULL rows.
      .or('pricing_model.is.null,pricing_model.not.in.(bogo,perk)')
      .order('title')
      .limit(q.value.limit)
    if (q.value.q) query = query.ilike('title', `%${escapeLike(q.value.q)}%`)

    const { data, error } = await query
    if (error) return mapDbError(error, 'eligible-services GET')

    const ownerOf = await loadOwnerNames(supabase, data ?? [])
    return ok({
      services: (data ?? []).map((s: { partner_id: string | null; vendor_id: string | null }) => ({ ...s, ...ownerOf(s) })),
    })
  } catch (err) {
    return mapDbError(err, 'eligible-services GET')
  }
}
