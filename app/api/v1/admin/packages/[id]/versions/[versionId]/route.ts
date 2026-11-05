import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, fetchAllRows, loadOwnerNames, mapDbError, ok } from '@/lib/catalog-api'
import { chunk } from '@/lib/catalog-guards'
import { isUuid } from '@/lib/catalog-validation'

const VERSION_COLUMNS =
  'id, package_id, version_number, status, title, subtitle, description, cover_image_url, magazine_url, min_guests, max_guests, price_note, pricing_terms, revision, created_by, updated_by, submitted_at, reviewed_by, reviewed_at, review_note, published_at, superseded_at, created_at, updated_at'
const COMPONENT_COLUMNS = 'id, slot_label, sort_order, requirement, quantity, notes'
const EVENT_COLUMNS = 'id, version_id, package_id, version_number, action, from_status, to_status, actor_id, note, revision, created_at'
const EDITABLE = ['draft', 'needs_changes']

interface OptionRow { id: string; component_id: string; catalog_item_id: string; service_id: string | null; is_default: boolean; sort_order: number }
interface ItemRow { id: string; name: string; item_type: string; image_url: string | null; status: string }
interface ServiceRow { id: string; title: string; price: number; pricing_model: string | null; status: string; partner_id: string | null; vendor_id: string | null }
interface LinkRow { catalog_item_id: string; service_id: string; status: string; price_treatment: string }

// The full editable document for one version.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const { id, versionId } = await params
    if (!isUuid(id) || !isUuid(versionId)) return fail(400, 'Invalid id')

    const supabase = createSupabaseAdmin()
    const [versionRes, compRes, eventRes] = await Promise.all([
      supabase.from('theme_package_versions').select(VERSION_COLUMNS)
        .eq('id', versionId).eq('package_id', id).maybeSingle(),
      supabase.from('theme_package_components').select(COMPONENT_COLUMNS)
        .eq('version_id', versionId).order('sort_order').order('created_at'),
      supabase.from('theme_package_version_events').select(EVENT_COLUMNS)
        .eq('version_id', versionId).order('created_at', { ascending: false }).limit(50),
    ])
    if (versionRes.error) return mapDbError(versionRes.error, 'version GET version')
    if (compRes.error) return mapDbError(compRes.error, 'version GET components')
    if (eventRes.error) return mapDbError(eventRes.error, 'version GET events')
    // The version must belong to the package in the URL.
    if (!versionRes.data) return fail(404, 'Package version not found')

    const components: { id: string }[] = compRes.data ?? []
    const compIds = components.map(c => c.id)

    const optionPages = await Promise.all(
      chunk(compIds).map(ids =>
        fetchAllRows<OptionRow>((from, to) =>
          supabase.from('theme_package_component_options')
            .select('id, component_id, catalog_item_id, service_id, is_default, sort_order')
            .in('component_id', ids).order('component_id').order('sort_order').order('id').range(from, to)))
    )
    const optionErr = optionPages.find(p => p.error)
    if (optionErr) return mapDbError(optionErr.error, 'version GET options')
    const options: OptionRow[] = optionPages.flatMap(p => p.data ?? [])

    const itemIds = [...new Set(options.map(o => o.catalog_item_id))]
    const serviceIds = [...new Set(options.map(o => o.service_id).filter((x): x is string => !!x))]

    const [itemPages, servicePages, linkPages] = await Promise.all([
      Promise.all(chunk(itemIds).map(ids =>
        supabase.from('catalog_items').select('id, name, item_type, image_url, status').in('id', ids))),
      Promise.all(chunk(serviceIds).map(ids =>
        supabase.from('vendor_services')
          .select('id, title, price, pricing_model, status, partner_id, vendor_id').in('id', ids))),
      Promise.all(chunk(itemIds).map(ids =>
        fetchAllRows<LinkRow>((from, to) =>
          supabase.from('catalog_item_services')
            .select('catalog_item_id, service_id, status, price_treatment')
            .in('catalog_item_id', ids).order('id').range(from, to)))),
    ])
    const enrichErr = [...itemPages, ...servicePages].find(p => p.error) ?? linkPages.find(p => p.error)
    if (enrichErr) return mapDbError(enrichErr.error, 'version GET enrich')

    const items = new Map<string, ItemRow>(itemPages.flatMap(p => (p.data ?? []) as ItemRow[]).map(i => [i.id, i]))
    const services: ServiceRow[] = servicePages.flatMap(p => (p.data ?? []) as ServiceRow[])
    const serviceById = new Map<string, ServiceRow>(services.map(s => [s.id, s]))
    const links = new Map<string, LinkRow>(
      linkPages.flatMap(p => p.data ?? []).map(l => [`${l.catalog_item_id}:${l.service_id}`, l])
    )
    const ownerOf = await loadOwnerNames(supabase, services)

    const optionsByComponent = new Map<string, unknown[]>()
    for (const o of options) {
      const item = items.get(o.catalog_item_id)
      const svc = o.service_id ? serviceById.get(o.service_id) : undefined
      const link = o.service_id ? links.get(`${o.catalog_item_id}:${o.service_id}`) : undefined
      const list = optionsByComponent.get(o.component_id) ?? []
      list.push({
        ...o,
        catalog_item: item ? { name: item.name, item_type: item.item_type, image_url: item.image_url, status: item.status } : null,
        service: svc
          ? { title: svc.title, price: svc.price, pricing_model: svc.pricing_model, status: svc.status, ...ownerOf(svc) }
          : null,
        price_treatment: link?.price_treatment ?? null,
        link_status: link?.status ?? null,
      })
      optionsByComponent.set(o.component_id, list)
    }

    const version = versionRes.data
    return ok({
      version,
      editable: EDITABLE.includes(version.status),
      components: components.map(c => ({ ...c, options: optionsByComponent.get(c.id) ?? [] })),
      events: eventRes.data ?? [],
    })
  } catch (err) {
    return mapDbError(err, 'version GET')
  }
}
