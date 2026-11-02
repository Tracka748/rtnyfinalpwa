import { NextRequest } from 'next/server'
import { CAPABILITIES, requireAdmin, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, loadOwnerNames, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { isUuid, validateCreateLink } from '@/lib/catalog-validation'

const LINK_COLUMNS =
  'id, catalog_item_id, service_id, status, price_treatment, proposed_by, approved_by, approved_at, created_at'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.CATALOG_VIEW, 'read_only')
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid item id')

    const supabase = createSupabaseAdmin()
    const { data: item, error: itemErr } = await supabase
      .from('catalog_items').select('id').eq('id', id).maybeSingle()
    if (itemErr) return mapDbError(itemErr, 'items/[id]/services GET item')
    if (!item) return fail(404, 'Catalog item not found')

    const { data: links, error: linkErr } = await supabase
      .from('catalog_item_services').select(LINK_COLUMNS)
      .eq('catalog_item_id', id).order('created_at').limit(200)
    if (linkErr) return mapDbError(linkErr, 'items/[id]/services GET links')

    const serviceIds = [...new Set((links ?? []).map((l: { service_id: string }) => l.service_id))]
    const { data: services, error: svcErr } = serviceIds.length
      ? await supabase.from('vendor_services')
          .select('id, title, price, pricing_model, status, partner_id, vendor_id').in('id', serviceIds)
      : { data: [], error: null }
    if (svcErr) return mapDbError(svcErr, 'items/[id]/services GET services')

    const ownerOf = await loadOwnerNames(supabase, services ?? [])
    const byId = new Map<string, { id: string; partner_id: string | null; vendor_id: string | null }>(
      (services ?? []).map((s: { id: string; partner_id: string | null; vendor_id: string | null }) => [s.id, s])
    )

    return ok({
      links: (links ?? []).map((l: { service_id: string }) => {
        const s = byId.get(l.service_id)
        return { ...l, service: s ? { ...s, ...ownerOf(s) } : null }
      }),
    })
  } catch (err) {
    return mapDbError(err, 'items/[id]/services GET')
  }
}

export async function POST(
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
    const v = validateCreateLink(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const [itemRes, svcRes] = await Promise.all([
      supabase.from('catalog_items').select('id').eq('id', id).maybeSingle(),
      supabase.from('vendor_services').select('id, status').eq('id', v.value.service_id).maybeSingle(),
    ])
    if (itemRes.error) return mapDbError(itemRes.error, 'items/[id]/services POST item')
    if (svcRes.error) return mapDbError(svcRes.error, 'items/[id]/services POST service')
    if (!itemRes.data) return fail(404, 'Catalog item not found')
    if (!svcRes.data) return fail(400, 'Service not found')
    if (svcRes.data.status !== 'active') return fail(400, 'Service must be active to be linked')

    // bogo/perk and price-vs-treatment rules are enforced by the DB trigger (mapped to 400).
    const { data, error } = await supabase
      .from('catalog_item_services')
      .insert({
        catalog_item_id: id,
        service_id: v.value.service_id,
        price_treatment: v.value.price_treatment,
        status: 'approved',
        proposed_by: auth.userId,
        approved_by: auth.userId,
      })
      .select(LINK_COLUMNS)
      .single()
    if (error) return mapDbError(error, 'items/[id]/services POST')
    return ok({ link: data }, 201)
  } catch (err) {
    return mapDbError(err, 'items/[id]/services POST')
  }
}
