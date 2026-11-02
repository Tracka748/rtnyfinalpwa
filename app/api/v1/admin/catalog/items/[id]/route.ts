import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { findLivePackageUsage, formatLiveUseMessage } from '@/lib/catalog-guards'
import { isUuid, validateUpdateItem } from '@/lib/catalog-validation'

const ITEM_COLUMNS =
  'id, key, name, description, item_type, occasions, image_url, status, created_by, approved_by, approved_at, created_at, updated_at'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid item id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateUpdateItem(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const { data: current, error: curErr } = await supabase
      .from('catalog_items').select('id, status').eq('id', id).maybeSingle()
    if (curErr) return mapDbError(curErr, 'items/[id] PATCH read')
    if (!current) return fail(404, 'Catalog item not found')

    // Taking an active item out of service must not break a live package.
    if (current.status === 'active' && v.value.status !== undefined && v.value.status !== 'active') {
      const usage = await findLivePackageUsage(supabase, { catalogItemId: id })
      if (!usage.ok) return mapDbError(usage.error, 'items/[id] PATCH live-package guard')
      if (usage.uses.length > 0) return fail(409, formatLiveUseMessage(usage.uses, 'item'))
    }

    const patch: Record<string, unknown> = { ...v.value }
    // Activation needs an admin approver; it is always the verified session user.
    if (v.value.status === 'active' && current.status !== 'active') patch.approved_by = auth.userId

    const { data, error } = await supabase
      .from('catalog_items').update(patch).eq('id', id).select(ITEM_COLUMNS).maybeSingle()
    if (error) return mapDbError(error, 'items/[id] PATCH')
    if (!data) return fail(404, 'Catalog item not found')
    return ok({ item: data })
  } catch (err) {
    return mapDbError(err, 'items/[id] PATCH')
  }
}
