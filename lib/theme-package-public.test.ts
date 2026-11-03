import { describe, expect, it } from 'vitest'
import {
  isOptionAvailable, parseGuestCount, projectCard, projectLiveDocument, projectSnapshot, projectSnapshotSummary,
  type OwnerResolver, type RawComponent, type RawItem, type RawLink, type RawOption, type RawService,
} from '@/lib/theme-package-public'
import { findLeaks } from '@/lib/test-support/leaks'

const SECRETS = ['SECRET-CREATOR', 'SECRET-REVIEWER', 'SECRET-NOTE', 'SECRET-PARTNER', 'SECRET-VENDOR', 'SECRET-SERVICE', 'SECRET-ITEM', 'SECRET-LINK', 'SECRET-PKG']

describe('isOptionAvailable (the one fulfillability rule)', () => {
  const ok = { status: 'active' }
  const cases: Array<[string, Parameters<typeof isOptionAvailable>[0], boolean]> = [
    ['active item, no service', { serviceId: null, item: ok, service: null, link: null }, true],
    ['archived item, no service', { serviceId: null, item: { status: 'archived' }, service: null, link: null }, false],
    ['draft item, no service', { serviceId: null, item: { status: 'draft' }, service: null, link: null }, false],
    ['missing item', { serviceId: null, item: undefined, service: null, link: null }, false],
    ['active item + approved link + active service', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'flat' }, link: { status: 'approved' } }, true],
    ['link rejected', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'flat' }, link: { status: 'rejected' } }, false],
    ['link pending', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'flat' }, link: { status: 'pending' } }, false],
    ['link missing', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'flat' }, link: undefined }, false],
    ['service inactive', { serviceId: 's', item: ok, service: { status: 'draft', pricing_model: 'flat' }, link: { status: 'approved' } }, false],
    ['service needs_changes', { serviceId: 's', item: ok, service: { status: 'needs_changes', pricing_model: 'flat' }, link: { status: 'approved' } }, false],
    ['service missing', { serviceId: 's', item: ok, service: undefined, link: { status: 'approved' } }, false],
    ['archived item with approved link + active service', { serviceId: 's', item: { status: 'archived' }, service: { status: 'active', pricing_model: 'flat' }, link: { status: 'approved' } }, false],
    ['bogo service (snapshot refuses promotions)', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'bogo' }, link: { status: 'approved' } }, false],
    ['perk service', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: 'perk' }, link: { status: 'approved' } }, false],
    ['null pricing model is fine', { serviceId: 's', item: ok, service: { status: 'active', pricing_model: null }, link: { status: 'approved' } }, true],
  ]
  it.each(cases)('%s', (_name, input, expected) => {
    expect(isOptionAvailable(input)).toBe(expected)
  })
})

// ---- fixtures: raw rows deliberately carry internal columns that must never come out ----
const ownerOf: OwnerResolver = s =>
  s.partner_id ? { owner_type: 'partner', owner_name: 'Cake Co' } : s.vendor_id ? { owner_type: 'vendor', owner_name: 'DJ Vee' } : { owner_type: null, owner_name: null }

const item = (id: string, over: Partial<RawItem> = {}): RawItem => ({
  id, name: `Item ${id}`, description: 'desc', item_type: 'food', image_url: 'https://x.com/i.png', status: 'active',
  ...({ created_by: 'SECRET-CREATOR', approved_by: 'SECRET-CREATOR' } as object), ...over,
})
const service = (id: string, over: Partial<RawService> = {}): RawService => ({
  id, price: 100, pricing_model: 'flat', status: 'active', partner_id: 'SECRET-PARTNER', vendor_id: null, ...over,
})
const link = (itemId: string, serviceId: string, over: Partial<RawLink> = {}): RawLink => ({
  catalog_item_id: itemId, service_id: serviceId, status: 'approved', price_treatment: 'listed',
  ...({ id: 'SECRET-LINK', approved_by: 'SECRET-REVIEWER' } as object), ...over,
})
const comp = (id: string, sort: number, requirement = 'required'): RawComponent => ({ id, slot_label: `Slot ${id}`, sort_order: sort, requirement, quantity: 1, notes: null })
const opt = (id: string, componentId: string, itemId: string, serviceId: string | null, isDefault: boolean, sort = 0): RawOption => ({
  id, component_id: componentId, catalog_item_id: itemId, service_id: serviceId, is_default: isDefault, sort_order: sort,
})

const version = {
  id: 'v1', title: 'Spooky', subtitle: null, description: 'D', cover_image_url: null, magazine_url: null, price_note: 'From $500',
  min_guests: 5, max_guests: 30, published_at: '2026-11-01T00:00:00Z',
  ...({ created_by: 'SECRET-CREATOR', reviewed_by: 'SECRET-REVIEWER', review_note: 'SECRET-NOTE', status: 'approved', revision: 4 } as object),
}

function doc(over: { components?: RawComponent[]; options?: RawOption[]; items?: RawItem[]; services?: RawService[]; links?: RawLink[] } = {}) {
  return projectLiveDocument({
    pkg: { key: 'spooky', occasion: 'Birthday', ...({ id: 'SECRET-PKG' } as object) },
    theme: { id: 't1', name: 'Spooky' },
    version,
    components: over.components ?? [comp('c1', 0)],
    options: over.options ?? [opt('o1', 'c1', 'i1', 's1', true)],
    items: over.items ?? [item('i1')],
    services: over.services ?? [service('s1')],
    links: over.links ?? [link('i1', 's1')],
    ownerOf,
  })
}

describe('projectLiveDocument: output shape and privacy', () => {
  it('exposes only the public fields', () => {
    const d = doc()
    expect(Object.keys(d).sort()).toEqual(['components', 'key', 'meta', 'occasion', 'requestable', 'theme', 'version_id'])
    expect(Object.keys(d.meta).sort()).toEqual(['cover_image_url', 'description', 'magazine_url', 'max_guests', 'min_guests', 'price_note', 'published_at', 'subtitle', 'title'])
    expect(Object.keys(d.components[0]).sort()).toEqual(['available', 'id', 'notes', 'options', 'quantity', 'requirement', 'slot_label'])
    expect(Object.keys(d.components[0].options[0]).sort()).toEqual(['available', 'id', 'is_default', 'item', 'pricing', 'provider'])
    expect(Object.keys(d.components[0].options[0].item!).sort()).toEqual(['description', 'image_url', 'item_type', 'name'])
    expect(d.components[0].options[0].provider).toEqual({ type: 'partner', name: 'Cake Co' })
  })
  it('leaks no internal key or value anywhere', () => {
    expect(findLeaks(doc(), { secrets: SECRETS })).toEqual([])
  })
  it('leaks nothing even when every option is unavailable or unpriced', () => {
    const d = doc({ items: [item('i1', { status: 'archived' })], links: [link('i1', 's1', { status: 'rejected' })] })
    expect(findLeaks(d, { secrets: SECRETS })).toEqual([])
  })
})

describe('projectLiveDocument: available / requestable', () => {
  it('everything fine -> requestable', () => {
    const d = doc()
    expect(d.components[0].available).toBe(true)
    expect(d.requestable).toBe(true)
  })
  it('item archived -> option, component and package unavailable', () => {
    const d = doc({ items: [item('i1', { status: 'archived' })] })
    expect(d.components[0].options[0].available).toBe(false)
    expect(d.components[0].available).toBe(false)
    expect(d.requestable).toBe(false)
  })
  it('link rejected -> unavailable', () => {
    expect(doc({ links: [link('i1', 's1', { status: 'rejected' })] }).requestable).toBe(false)
  })
  it('service inactive -> unavailable', () => {
    expect(doc({ services: [service('s1', { status: 'draft' })] }).requestable).toBe(false)
  })
  it('null service (vendor to be assigned) is available when the item is active', () => {
    const d = doc({ options: [opt('o1', 'c1', 'i1', null, true)], services: [], links: [] })
    expect(d.components[0].available).toBe(true)
    expect(d.requestable).toBe(true)
    expect(d.components[0].options[0].provider).toBeNull()
    expect(d.components[0].options[0].pricing).toEqual({ treatment: 'quote', price: null, pricing_model: null })
  })
  it('component availability follows its DEFAULT option, not the others', () => {
    const d = doc({
      options: [opt('o1', 'c1', 'i1', 's1', true, 0), opt('o2', 'c1', 'i2', null, false, 1)],
      items: [item('i1'), item('i2', { status: 'archived' })],
    })
    expect(d.components[0].available).toBe(true)
    expect(d.components[0].options.map(o => o.available)).toEqual([true, false])
  })
  it('a component with no default option is unavailable', () => {
    expect(doc({ options: [opt('o1', 'c1', 'i1', 's1', false)] }).components[0].available).toBe(false)
  })
  it('only REQUIRED components decide requestable', () => {
    const components = [comp('c1', 0, 'required'), comp('c2', 1, 'optional_on'), comp('c3', 2, 'optional_off')]
    const options = [opt('o1', 'c1', 'i1', null, true), opt('o2', 'c2', 'i2', null, true), opt('o3', 'c3', 'i2', null, true)]
    const d = doc({ components, options, items: [item('i1'), item('i2', { status: 'archived' })], services: [], links: [] })
    expect(d.components.map(c => c.available)).toEqual([true, false, false])
    expect(d.requestable).toBe(true)
    const d2 = doc({ components, options, items: [item('i1', { status: 'archived' }), item('i2')], services: [], links: [] })
    expect(d2.requestable).toBe(false)
  })
  it('no components -> not requestable', () => {
    expect(doc({ components: [], options: [] }).requestable).toBe(false)
  })
})

describe('projectLiveDocument: pricing and ordering', () => {
  const pricing = (d: ReturnType<typeof doc>) => d.components[0].options[0].pricing
  it('listed shows the price and model', () => {
    expect(pricing(doc({ services: [service('s1', { price: 250, pricing_model: 'per_person' })] }))).toEqual({ treatment: 'listed', price: 250, pricing_model: 'per_person' })
  })
  it('free and quote never show a price, even when the service has one', () => {
    expect(pricing(doc({ links: [link('i1', 's1', { price_treatment: 'free' })] }))).toEqual({ treatment: 'free', price: null, pricing_model: 'flat' })
    expect(pricing(doc({ links: [link('i1', 's1', { price_treatment: 'quote' })] }))).toEqual({ treatment: 'quote', price: null, pricing_model: 'flat' })
  })
  it('listed with a zero/null service price shows no price; a rejected link falls back to quote', () => {
    expect(pricing(doc({ services: [service('s1', { price: 0 })] })).price).toBeNull()
    expect(pricing(doc({ services: [service('s1', { price: null })] })).price).toBeNull()
    expect(pricing(doc({ links: [link('i1', 's1', { status: 'rejected' })] }))).toMatchObject({ treatment: 'quote', price: null })
  })
  it('an unknown treatment value degrades to quote', () => {
    expect(pricing(doc({ links: [link('i1', 's1', { price_treatment: 'weird' })] })).treatment).toBe('quote')
  })
  it('orders components and options by sort_order', () => {
    const d = doc({
      components: [comp('c2', 5), comp('c1', 1)],
      options: [opt('o2', 'c1', 'i1', null, false, 9), opt('o1', 'c1', 'i1', null, true, 2)],
      services: [], links: [],
    })
    expect(d.components.map(c => c.id)).toEqual(['c1', 'c2'])
    expect(d.components[0].options.map(o => o.id)).toEqual(['o1', 'o2'])
  })
  it('a vendor-owned service shows the vendor as provider', () => {
    const d = doc({ services: [service('s1', { partner_id: null, vendor_id: 'SECRET-VENDOR' })] })
    expect(d.components[0].options[0].provider).toEqual({ type: 'vendor', name: 'DJ Vee' })
    expect(findLeaks(d, { secrets: SECRETS })).toEqual([])
  })
})

describe('projectCard', () => {
  it('picks only the card fields', () => {
    const card = projectCard({
      pkg: { key: 'spooky', occasion: 'Birthday', ...({ id: 'SECRET-PKG' } as object) },
      theme: { id: 't1', name: 'Spooky', ...({ active: true } as object) },
      version: { ...version, description: 'long' } as never,
    })
    expect(Object.keys(card).sort()).toEqual(['cover_image_url', 'key', 'max_guests', 'min_guests', 'occasion', 'price_note', 'subtitle', 'theme', 'title'])
    expect(card.theme).toEqual({ id: 't1', name: 'Spooky' })
    expect(findLeaks(card, { secrets: SECRETS })).toEqual([])
  })
})

// ---- snapshot projection ----
const rawSnapshot = {
  snapshot_version: 2,
  package_id: 'SECRET-PKG',
  package_key: 'spooky',
  package_version_id: 'SECRET-PKG',
  version_number: 3,
  title: 'Spooky',
  occasion: 'Birthday',
  guest_count: 20,
  event_date: '2027-01-15',
  items: [
    { component_id: 'c1', slot_label: 'Cake', option_id: 'o1', catalog_item_id: 'SECRET-ITEM', catalog_item_name: 'Cake', item_type: 'food', service_id: 'SECRET-SERVICE', service_title: 'SECRET-SERVICE title', partner_id: 'SECRET-PARTNER', vendor_id: 'SECRET-VENDOR', quantity: 2, listed_price: 40, pricing_model: 'flat', price_treatment: 'listed', price_status: 'priced', line_total: 80, price_note: null, guest_fit: true },
    { component_id: 'c2', slot_label: 'DJ', option_id: 'o2', catalog_item_id: 'SECRET-ITEM', catalog_item_name: 'DJ', item_type: 'entertainment', service_id: 'SECRET-SERVICE', partner_id: 'SECRET-PARTNER', vendor_id: null, quantity: 1, listed_price: 500, pricing_model: 'flat', price_treatment: 'quote', price_status: 'quote', line_total: null, price_note: 'price on request', guest_fit: true },
    { component_id: 'c3', slot_label: 'Candy', option_id: 'o3', catalog_item_name: 'Candy', item_type: 'favor', quantity: 1, listed_price: 0, pricing_model: 'flat', price_treatment: 'free', price_status: 'free', line_total: 0, price_note: 'included at no charge', guest_fit: null },
  ],
  excluded: [{ component_id: 'c4', slot_label: 'Balloons' }],
  listed_subtotal: 80,
  unpriced_items: 1,
  captured_at: '2026-11-03T00:00:00Z',
}

describe('projectSnapshot', () => {
  it('returns exactly the public fields', () => {
    const s = projectSnapshot(rawSnapshot)!
    expect(Object.keys(s).sort()).toEqual(['event_date', 'excluded', 'guest_count', 'items', 'listed_subtotal', 'unpriced_items'])
    expect(Object.keys(s.items[0]).sort()).toEqual(['catalog_item_name', 'component_id', 'guest_fit', 'item_type', 'line_total', 'listed_price', 'option_id', 'price_note', 'price_status', 'price_treatment', 'pricing_model', 'quantity', 'slot_label'])
    expect(s.excluded).toEqual([{ component_id: 'c4', slot_label: 'Balloons' }])
    expect(s.listed_subtotal).toBe(80)
    expect(s.unpriced_items).toBe(1)
  })
  it('leaks no internal key or value (ids, captured_at, package ids, service/partner/vendor)', () => {
    expect(findLeaks(projectSnapshot(rawSnapshot), { secrets: SECRETS })).toEqual([])
    const json = JSON.stringify(projectSnapshot(rawSnapshot))
    expect(json).not.toContain('captured_at')
    expect(json).not.toContain('service_title')
  })
  it('shows listed_price only for the listed treatment', () => {
    const s = projectSnapshot(rawSnapshot)!
    expect(s.items.map(i => i.listed_price)).toEqual([40, null, null])
    expect(s.items.map(i => i.line_total)).toEqual([80, null, 0])
  })
  it('tolerates a v1 snapshot: no treatment, so no price is shown', () => {
    const v1 = { snapshot_version: 1, guest_count: 10, event_date: null, items: [{ component_id: 'c1', slot_label: 'A', option_id: 'o', catalog_item_name: 'A', item_type: 'food', quantity: 1, listed_price: 99, pricing_model: 'flat', guest_fit: true }], excluded: [], listed_subtotal: 99, unpriced_items: 0 }
    const s = projectSnapshot(v1)!
    expect(s.items[0]).toMatchObject({ price_treatment: null, price_status: null, listed_price: null, line_total: null })
  })
  it('returns null for non-objects and empty lists for junk fields', () => {
    for (const x of [null, undefined, 'x', 5, []]) expect(projectSnapshot(x)).toBeNull()
    expect(projectSnapshot({ items: 'x', excluded: 5 })).toMatchObject({ items: [], excluded: [], listed_subtotal: null, unpriced_items: null })
    expect(projectSnapshot({ items: [null, 'x', { slot_label: 'Ok' }] })!.items).toHaveLength(1)
  })
  it('drops an unknown price_status and an unknown treatment', () => {
    const s = projectSnapshot({ items: [{ price_status: 'weird', price_treatment: 'weird', listed_price: 5 }] })!
    expect(s.items[0]).toMatchObject({ price_status: null, price_treatment: null, listed_price: null })
  })
})

describe('projectSnapshotSummary / parseGuestCount', () => {
  it('summarises a snapshot', () => {
    expect(projectSnapshotSummary(rawSnapshot)).toEqual({ package: { key: 'spooky', title: 'Spooky' }, listed_subtotal: 80, unpriced_items: 1 })
    expect(findLeaks(projectSnapshotSummary(rawSnapshot), { secrets: SECRETS })).toEqual([])
  })
  it('handles missing data', () => {
    expect(projectSnapshotSummary(null)).toEqual({ package: null, listed_subtotal: null, unpriced_items: null })
    expect(projectSnapshotSummary({ package_key: 'x' }).package).toBeNull()
  })
  it('parses the text guest_count', () => {
    expect(parseGuestCount('25')).toBe(25)
    expect(parseGuestCount(' 25 ')).toBe(25)
    for (const v of ['50-100', '', 'abc', null, undefined, 25, '2.5']) expect(parseGuestCount(v)).toBeNull()
  })
})
