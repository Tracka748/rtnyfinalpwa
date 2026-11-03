import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import { findLeaks } from '@/lib/test-support/leaks'
import { GET as listGet } from './route'
import { GET as docGet } from './[key]/route'
import { POST as previewPost } from './[key]/preview/route'

const SECRETS = ['SECRET-CREATOR', 'SECRET-REVIEWER', 'SECRET-NOTE', 'SECRET-PARTNER-ID', 'SECRET-SERVICE-ID', 'SECRET-ITEM-ID', 'SECRET-LINK-ID']
const PKG = { id: 'pkg-1', key: 'spooky_birthday', occasion: 'Birthday', status: 'active', theme_id: 'theme-1', live_version_id: 'ver-1' }
const VERSION = {
  id: 'ver-1', package_id: 'pkg-1', title: 'Spooky Birthday', subtitle: 'Boo', description: 'D', cover_image_url: 'https://x.com/c.png',
  magazine_url: null, price_note: 'From $500', min_guests: 5, max_guests: 30, published_at: '2026-11-01T00:00:00Z', status: 'approved',
  created_by: 'SECRET-CREATOR', reviewed_by: 'SECRET-REVIEWER', review_note: 'SECRET-NOTE', revision: 9,
}
const DOC_TABLES = {
  themes: { id: 'theme-1', name: 'Spooky' },
  theme_package_components: [{ id: 'comp-1', slot_label: 'Cake', sort_order: 0, requirement: 'required', quantity: 1, notes: null }],
  theme_package_component_options: [{ id: 'opt-1', component_id: 'comp-1', catalog_item_id: 'SECRET-ITEM-ID', service_id: 'SECRET-SERVICE-ID', is_default: true, sort_order: 0 }],
  catalog_items: [{ id: 'SECRET-ITEM-ID', name: 'Cake', description: 'Yum', item_type: 'food', image_url: null, status: 'active', created_by: 'SECRET-CREATOR' }],
  vendor_services: [{ id: 'SECRET-SERVICE-ID', price: 80, pricing_model: 'flat', status: 'active', partner_id: 'SECRET-PARTNER-ID', vendor_id: null }],
  catalog_item_services: [{ id: 'SECRET-LINK-ID', catalog_item_id: 'SECRET-ITEM-ID', service_id: 'SECRET-SERVICE-ID', status: 'approved', price_treatment: 'listed', approved_by: 'SECRET-REVIEWER' }],
  partners: [{ id: 'SECRET-PARTNER-ID', display_name: 'Cake Co' }],
}

function use(tables: Record<string, unknown>, rpc?: (fn: string, a: Record<string, unknown>) => FakeResult) {
  const f = fakeSupabase({ respond: (q: Recorded) => ({ data: tables[q.table] ?? null, error: null }), rpc })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

// A real NextRequest: the list route reads request.nextUrl.
const req = (url = 'http://localhost/api/v1/theme-packages', init?: RequestInit) => new NextRequest(url, init as never)
const keyParams = (key: string) => ({ params: Promise.resolve({ key }) })
const post = (body: unknown, key = 'spooky_birthday') =>
  previewPost(req('http://localhost/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), keyParams(key))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /theme-packages', () => {
  const tables = { theme_packages: [PKG], theme_package_versions: [VERSION], themes: [{ id: 'theme-1', name: 'Spooky' }] }

  it('returns public cards only, filtered to active packages with a live pointer', async () => {
    const f = use(tables)
    const res = await listGet(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.packages).toEqual([{
      key: 'spooky_birthday', occasion: 'Birthday', theme: { id: 'theme-1', name: 'Spooky' }, title: 'Spooky Birthday',
      subtitle: 'Boo', cover_image_url: 'https://x.com/c.png', price_note: 'From $500', min_guests: 5, max_guests: 30,
    }])
    expect(body.data).toMatchObject({ has_more: false, next_offset: null })
    expect(findLeaks(body, { secrets: SECRETS })).toEqual([])
    expect(f.calls[0].eq).toEqual({ status: 'active' })
    expect(f.calls[1].eq).toEqual({ status: 'approved' }) // versions must be approved
  })
  it('applies the occasion and theme filters', async () => {
    const f = use(tables)
    await listGet(req('http://localhost/x?occasion=Birthday&theme_id=11111111-1111-1111-1111-111111111111'))
    expect(f.calls[0].eq).toEqual({ status: 'active', occasion: 'Birthday', theme_id: '11111111-1111-1111-1111-111111111111' })
  })
  it('drops a package whose live version is not an approved version of it', async () => {
    use({ ...tables, theme_package_versions: [{ ...VERSION, package_id: 'other' }] })
    expect((await (await listGet(req())).json()).data.packages).toEqual([])
    use({ ...tables, theme_package_versions: [] })
    expect((await (await listGet(req())).json()).data.packages).toEqual([])
  })
  it('paginates: 51 rows -> has_more with next_offset', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ ...PKG, id: `pkg-${i}`, key: `k${String(i).padStart(2, '0')}`, live_version_id: `ver-${i}` }))
    use({ theme_packages: many, theme_package_versions: [], themes: [] })
    const body = await (await listGet(req('http://localhost/x?offset=100'))).json()
    expect(body.data).toMatchObject({ has_more: true, next_offset: 150 })
  })
  it('rejects bad query values and hides database errors', async () => {
    use(tables)
    expect((await listGet(req('http://localhost/x?theme_id=nope'))).status).toBe(400)
    expect((await listGet(req('http://localhost/x?offset=-1'))).status).toBe(400)
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000', message: 'relation "theme_packages" secret detail' } }) })
    h.createSupabaseAdmin.mockReturnValue(f.client)
    const res = await listGet(req())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret detail')
  })
})

describe('GET /theme-packages/[key]', () => {
  it('returns the live document with nothing internal', async () => {
    use({ theme_packages: PKG, theme_package_versions: VERSION, ...DOC_TABLES })
    const res = await docGet(req(), keyParams('spooky_birthday'))
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.version_id).toBe('ver-1')
    expect(data.requestable).toBe(true)
    expect(data.components[0].options[0]).toMatchObject({
      available: true, pricing: { treatment: 'listed', price: 80, pricing_model: 'flat' }, provider: { type: 'partner', name: 'Cake Co' },
      item: { name: 'Cake', description: 'Yum', item_type: 'food', image_url: null },
    })
    expect(findLeaks(data, { secrets: SECRETS })).toEqual([])
  })
  it('unknown, archived, not-live and malformed keys all get the identical 404', async () => {
    const bodies: string[] = []
    const run = async (tables: Record<string, unknown>, key: string) => {
      use(tables)
      const res = await docGet(req(), keyParams(key))
      expect(res.status).toBe(404)
      bodies.push(JSON.stringify(await res.json()))
    }
    await run({ theme_packages: null }, 'nope')
    await run({ theme_packages: { ...PKG, status: 'archived' } }, 'spooky_birthday')
    await run({ theme_packages: { ...PKG, live_version_id: null } }, 'spooky_birthday')
    await run({ theme_packages: PKG, theme_package_versions: { ...VERSION } }, 'Bad-Key')
    await run({ theme_packages: PKG, theme_package_versions: null }, 'spooky_birthday')
    expect(new Set(bodies).size).toBe(1)
  })
  it('a malformed key never reaches the database', async () => {
    const f = use({})
    await docGet(req(), keyParams('../../etc'))
    expect(f.calls).toHaveLength(0)
  })
})

describe('POST /theme-packages/[key]/preview', () => {
  const RAW_SNAPSHOT = {
    snapshot_version: 2, package_id: 'pkg-1', package_key: 'spooky_birthday', package_version_id: 'ver-1', version_number: 3, title: 'Spooky',
    occasion: 'Birthday', guest_count: 20, event_date: '2099-01-15',
    items: [{ component_id: 'comp-1', slot_label: 'Cake', option_id: 'opt-1', catalog_item_id: 'SECRET-ITEM-ID', catalog_item_name: 'Cake', item_type: 'food', service_id: 'SECRET-SERVICE-ID', service_title: 'x', partner_id: 'SECRET-PARTNER-ID', vendor_id: null, quantity: 1, listed_price: 80, pricing_model: 'flat', price_treatment: 'listed', price_status: 'priced', line_total: 80, price_note: null, guest_fit: true }],
    excluded: [], listed_subtotal: 80, unpriced_items: 0, captured_at: '2026-11-03T00:00:00Z',
  }
  const live = { theme_packages: PKG, theme_package_versions: VERSION, themes: { id: 'theme-1', name: 'Spooky' } }

  it('builds the snapshot server-side from the live version and returns the public projection', async () => {
    const f = use(live, () => ({ data: RAW_SNAPSHOT, error: null }))
    const sel = { components: [{ component_id: '11111111-1111-1111-1111-111111111111', included: false }] }
    const res = await post({ selection: sel, guest_count: 20, event_date: '2099-01-15' })
    expect(res.status).toBe(200)
    expect(f.rpcCalls).toEqual([{
      fn: 'theme_package_build_snapshot',
      args: { p_version_id: 'ver-1', p_selection: sel, p_guest_count: 20, p_event_date: '2099-01-15' },
    }])
    const { data } = await res.json()
    expect(Object.keys(data).sort()).toEqual(['event_date', 'excluded', 'guest_count', 'items', 'listed_subtotal', 'unpriced_items'])
    expect(data.items[0]).toMatchObject({ catalog_item_name: 'Cake', listed_price: 80, line_total: 80, price_treatment: 'listed' })
    expect(findLeaks(data, { secrets: SECRETS })).toEqual([])
    expect(JSON.stringify(data)).not.toContain('captured_at')
  })
  it('works with an empty body (everything optional)', async () => {
    const f = use(live, () => ({ data: RAW_SNAPSHOT, error: null }))
    expect((await post({})).status).toBe(200)
    expect(f.rpcCalls[0].args).toEqual({ p_version_id: 'ver-1', p_selection: { components: [] }, p_guest_count: null, p_event_date: null })
  })
  it.each(['price', 'listed_price', 'service_id', 'partner_id', 'vendor_id', 'catalog_item_id', 'snapshot', 'version_id', 'user_id', 'email'])(
    'rejects a client-supplied "%s" before any DB work',
    async key => {
      const f = use(live, () => ({ data: RAW_SNAPSHOT, error: null }))
      const res = await post({ [key]: 'x' })
      expect(res.status).toBe(400)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
      expect(f.rpcCalls).toHaveLength(0)
    }
  )
  it('passes the function messages (P0001) through as 400', async () => {
    use(live, () => ({ data: null, error: { code: 'P0001', message: "guest count is outside this package's range" } }))
    const res = await post({ guest_count: 500 })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("guest count is outside this package's range")
  })
  it('never returns raw Postgres errors', async () => {
    use(live, () => ({ data: null, error: { code: 'XX000', message: 'relation "x" violates secret detail' } }))
    const res = await post({})
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
  })
  it('404 (same response) for an unknown or not-live package, and no rpc', async () => {
    const f = use({ theme_packages: null })
    expect((await post({}, 'nope')).status).toBe(404)
    expect(f.rpcCalls).toHaveLength(0)
    const g = use({ theme_packages: { ...PKG, status: 'archived' } })
    expect((await post({})).status).toBe(404)
    expect(g.rpcCalls).toHaveLength(0)
  })
  it('400 on invalid JSON', async () => {
    use(live)
    const res = await previewPost(req('http://localhost/x', { method: 'POST', body: '{nope' }), keyParams('spooky_birthday'))
    expect(res.status).toBe(400)
  })
})
