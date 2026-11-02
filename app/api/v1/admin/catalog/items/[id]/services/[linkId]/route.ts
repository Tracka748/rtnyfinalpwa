import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { findLivePackageUsage, formatLiveUseMessage } from '@/lib/catalog-guards'
import { isUuid, validateUpdateLink } from '@/lib/catalog-validation'

const LINK_COLUMNS =
  'id, catalog_item_id, service_id, status, price_treatment, proposed_by, approved_by, approved_at, created_at'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const { id, linkId } = await params
    if (!isUuid(id) || !isUuid(linkId)) return fail(400, 'Invalid id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateUpdateLink(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const { data: current, error: curErr } = await supabase
      .from('catalog_item_services').select('id, service_id, status')
      .eq('id', linkId).eq('catalog_item_id', id).maybeSingle()
    if (curErr) return mapDbError(curErr, 'items/[id]/services/[linkId] PATCH read')
    if (!current) return fail(404, 'Link not found')

    // Rejecting an approved link must not break a live package that uses this item + service.
    if (current.status === 'approved' && v.value.status === 'rejected') {
      const usage = await findLivePackageUsage(supabase, { catalogItemId: id, serviceId: current.service_id })
      if (!usage.ok) return mapDbError(usage.error, 'items/[id]/services/[linkId] PATCH live-package guard')
      if (usage.uses.length > 0) return fail(409, formatLiveUseMessage(usage.uses, 'service link'))
    }

    const patch: Record<string, unknown> = { ...v.value }
    // (Re-)approval needs an admin approver; it is always the verified session user.
    if (v.value.status === 'approved' && current.status !== 'approved') patch.approved_by = auth.userId

    const { data, error } = await supabase
      .from('catalog_item_services').update(patch)
      .eq('id', linkId).eq('catalog_item_id', id).select(LINK_COLUMNS).maybeSingle()
    if (error) return mapDbError(error, 'items/[id]/services/[linkId] PATCH')
    if (!data) return fail(404, 'Link not found')
    return ok({ link: data })
  } catch (err) {
    return mapDbError(err, 'items/[id]/services/[linkId] PATCH')
  }
}
