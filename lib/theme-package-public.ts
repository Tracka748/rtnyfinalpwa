// Pure projections for the public / customer theme-package routes. No I/O.
// Every output is built from an explicit allowlist of fields, so extra columns on the raw rows
// (created_by, reviewed_by, partner_id, service_id, ...) can never reach a response.

import { PRICE_TREATMENTS, type PriceTreatment } from '@/lib/catalog-validation'

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)
const obj = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const treatment = (v: unknown): PriceTreatment | null =>
  typeof v === 'string' && (PRICE_TREATMENTS as readonly string[]).includes(v) ? (v as PriceTreatment) : null
const PRICE_STATUSES = ['priced', 'free', 'quote']

// ---- snapshot (stored or freshly built) ----

export interface PublicSnapshotItem {
  component_id: string | null
  slot_label: string | null
  option_id: string | null
  catalog_item_name: string | null
  item_type: string | null
  quantity: number | null
  pricing_model: string | null
  price_treatment: PriceTreatment | null
  price_status: string | null
  listed_price: number | null
  line_total: number | null
  price_note: string | null
  guest_fit: boolean | null
}

export interface PublicSnapshot {
  guest_count: number | null
  event_date: string | null
  items: PublicSnapshotItem[]
  excluded: Array<{ component_id: string | null; slot_label: string | null }>
  listed_subtotal: number | null
  unpriced_items: number | null
}

/** Public view of a theme_package_build_snapshot result. Tolerates v1 snapshots and junk (returns null). */
export function projectSnapshot(raw: unknown): PublicSnapshot | null {
  const s = obj(raw)
  if (!s) return null
  const items = (Array.isArray(s.items) ? s.items : []).flatMap((x): PublicSnapshotItem[] => {
    const i = obj(x)
    if (!i) return []
    const t = treatment(i.price_treatment)
    const status = str(i.price_status)
    return [{
      component_id: str(i.component_id),
      slot_label: str(i.slot_label),
      option_id: str(i.option_id),
      catalog_item_name: str(i.catalog_item_name),
      item_type: str(i.item_type),
      quantity: num(i.quantity),
      pricing_model: str(i.pricing_model),
      price_treatment: t,
      price_status: status && PRICE_STATUSES.includes(status) ? status : null,
      // A service price is only public when the admin chose to list it.
      listed_price: t === 'listed' ? num(i.listed_price) : null,
      line_total: num(i.line_total),
      price_note: str(i.price_note),
      guest_fit: bool(i.guest_fit),
    }]
  })
  const excluded = (Array.isArray(s.excluded) ? s.excluded : []).flatMap(x => {
    const e = obj(x)
    return e ? [{ component_id: str(e.component_id), slot_label: str(e.slot_label) }] : []
  })
  return {
    guest_count: num(s.guest_count),
    event_date: str(s.event_date),
    items,
    excluded,
    listed_subtotal: num(s.listed_subtotal),
    unpriced_items: num(s.unpriced_items),
  }
}

/** Package key/title and the headline numbers, for lists. */
export function projectSnapshotSummary(raw: unknown): {
  package: { key: string; title: string } | null
  listed_subtotal: number | null
  unpriced_items: number | null
} {
  const s = obj(raw)
  const key = s ? str(s.package_key) : null
  const title = s ? str(s.title) : null
  return {
    package: key && title ? { key, title } : null,
    listed_subtotal: s ? num(s.listed_subtotal) : null,
    unpriced_items: s ? num(s.unpriced_items) : null,
  }
}

/** plan_requests.guest_count is stored as text. */
export function parseGuestCount(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d+$/.test(v.trim())) return null
  return Number(v.trim())
}

// ---- cards ----

export interface PublicTheme { id: string; name: string }

export interface PublicCard {
  key: string
  occasion: string
  theme: PublicTheme | null
  title: string
  subtitle: string | null
  cover_image_url: string | null
  price_note: string | null
  min_guests: number | null
  max_guests: number | null
}

export function projectCard(input: {
  pkg: { key: string; occasion: string }
  theme: PublicTheme | null
  version: {
    title: string; subtitle: string | null; cover_image_url: string | null; price_note: string | null
    min_guests: number | null; max_guests: number | null
  }
}): PublicCard {
  const { pkg, theme, version } = input
  return {
    key: pkg.key,
    occasion: pkg.occasion,
    theme: theme ? { id: theme.id, name: theme.name } : null,
    title: version.title,
    subtitle: version.subtitle,
    cover_image_url: version.cover_image_url,
    price_note: version.price_note,
    min_guests: version.min_guests,
    max_guests: version.max_guests,
  }
}

// ---- live version document ----

export interface RawComponent { id: string; slot_label: string; sort_order: number; requirement: string; quantity: number; notes: string | null }
export interface RawOption { id: string; component_id: string; catalog_item_id: string; service_id: string | null; is_default: boolean; sort_order: number }
export interface RawItem { id: string; name: string; description: string | null; item_type: string; image_url: string | null; status: string }
export interface RawService { id: string; price: number | null; pricing_model: string | null; status: string; partner_id: string | null; vendor_id: string | null }
export interface RawLink { catalog_item_id: string; service_id: string; status: string; price_treatment: string }
export type OwnerResolver = (s: { partner_id: string | null; vendor_id: string | null }) => {
  owner_type: 'partner' | 'vendor' | null
  owner_name: string | null
}

/**
 * THE fulfillability rule (one function, tested). It mirrors tp_check_option_fulfillable:
 * the catalog item is active and, when a service is set, an admin-approved link exists and the
 * service is active. It also mirrors theme_package_build_snapshot, which refuses promotional
 * (bogo/perk) services, so `available` predicts whether the snapshot will succeed.
 */
export function isOptionAvailable(a: {
  serviceId: string | null
  item: { status: string } | null | undefined
  service: { status: string; pricing_model: string | null } | null | undefined
  link: { status: string } | null | undefined
}): boolean {
  if (!a.item || a.item.status !== 'active') return false
  if (a.serviceId === null) return true
  if (a.link?.status !== 'approved') return false
  if (!a.service || a.service.status !== 'active') return false
  return a.service.pricing_model !== 'bogo' && a.service.pricing_model !== 'perk'
}

export interface PublicPricing { treatment: PriceTreatment; price: number | null; pricing_model: string | null }

function pricingFor(service: RawService | undefined, link: RawLink | undefined): PublicPricing {
  if (!service) return { treatment: 'quote', price: null, pricing_model: null }
  const t = link?.status === 'approved' ? treatment(link.price_treatment) ?? 'quote' : 'quote'
  const price = t === 'listed' && typeof service.price === 'number' && service.price > 0 ? service.price : null
  return { treatment: t, price, pricing_model: service.pricing_model ?? null }
}

export interface PublicOption {
  id: string
  is_default: boolean
  available: boolean
  item: { name: string; description: string | null; item_type: string; image_url: string | null } | null
  pricing: PublicPricing
  provider: { type: 'partner' | 'vendor'; name: string } | null
}

export interface PublicComponent {
  id: string
  slot_label: string
  requirement: string
  quantity: number
  notes: string | null
  available: boolean
  options: PublicOption[]
}

export interface LiveDocument {
  key: string
  occasion: string
  theme: PublicTheme | null
  version_id: string
  meta: {
    title: string; subtitle: string | null; description: string | null; cover_image_url: string | null
    magazine_url: string | null; price_note: string | null; min_guests: number | null; max_guests: number | null
    published_at: string | null
  }
  requestable: boolean
  components: PublicComponent[]
}

export function projectLiveDocument(input: {
  pkg: { key: string; occasion: string }
  theme: PublicTheme | null
  version: LiveDocument['meta'] & { id: string }
  components: RawComponent[]
  options: RawOption[]
  items: RawItem[]
  services: RawService[]
  links: RawLink[]
  ownerOf: OwnerResolver
}): LiveDocument {
  const itemById = new Map(input.items.map(i => [i.id, i]))
  const serviceById = new Map(input.services.map(s => [s.id, s]))
  const linkByPair = new Map(input.links.map(l => [`${l.catalog_item_id}:${l.service_id}`, l]))
  const optionsByComponent = new Map<string, RawOption[]>()
  for (const o of input.options) {
    const list = optionsByComponent.get(o.component_id) ?? []
    list.push(o)
    optionsByComponent.set(o.component_id, list)
  }

  const projectOption = (o: RawOption): PublicOption => {
    const item = itemById.get(o.catalog_item_id)
    const service = o.service_id ? serviceById.get(o.service_id) : undefined
    const link = o.service_id ? linkByPair.get(`${o.catalog_item_id}:${o.service_id}`) : undefined
    const owner = service ? input.ownerOf(service) : null
    return {
      id: o.id,
      is_default: o.is_default,
      available: isOptionAvailable({ serviceId: o.service_id, item, service, link }),
      item: item ? { name: item.name, description: item.description, item_type: item.item_type, image_url: item.image_url } : null,
      pricing: pricingFor(service, link),
      provider: owner?.owner_type && owner.owner_name ? { type: owner.owner_type, name: owner.owner_name } : null,
    }
  }

  const components: PublicComponent[] = [...input.components]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => {
      const options = [...(optionsByComponent.get(c.id) ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(projectOption)
      return {
        id: c.id,
        slot_label: c.slot_label,
        requirement: c.requirement,
        quantity: c.quantity,
        notes: c.notes,
        available: options.find(o => o.is_default)?.available ?? false,
        options,
      }
    })

  const v = input.version
  return {
    key: input.pkg.key,
    occasion: input.pkg.occasion,
    theme: input.theme ? { id: input.theme.id, name: input.theme.name } : null,
    version_id: v.id,
    meta: {
      title: v.title, subtitle: v.subtitle, description: v.description, cover_image_url: v.cover_image_url,
      magazine_url: v.magazine_url, price_note: v.price_note, min_guests: v.min_guests, max_guests: v.max_guests,
      published_at: v.published_at,
    },
    requestable: components.length > 0 && components.every(c => c.requirement !== 'required' || c.available),
    components,
  }
}
