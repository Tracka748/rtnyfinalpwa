import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requireCapability: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))
vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireUser: h.requireUser, requireAdmin: h.requireAdmin, requireCapability: h.requireCapability }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase } from '@/lib/test-support/fake-supabase'
import { findLeaks } from '@/lib/test-support/leaks'
import { GET as listGet } from '../theme-package-requests/route'
import { GET as detailGet } from '../theme-package-requests/[id]/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const REQ_ID = '11111111-1111-1111-1111-111111111111'
const SECRETS = ['SECRET-PARTNER', 'SECRET-VENDOR', 'SECRET-SERVICE', 'SECRET-ITEM', 'SECRET-COORD', 'secret@x.com', 'SECRET-VERSION']

const SNAPSHOT = {
  snapshot_version: 2, package_id: 'SECRET-VERSION', package_key: 'spooky_birthday', package_version_id: 'SECRET-VERSION', title: 'Spooky', occasion: 'Birthday',
  guest_count: 20, event_date: '2099-01-15',
  items: [{ component_id: 'c1', slot_label: 'Cake', option_id: 'o1', catalog_item_id: 'SECRET-ITEM', catalog_item_name: 'Cake', item_type: 'food', service_id: 'SECRET-SERVICE', partner_id: 'SECRET-PARTNER', vendor_id: 'SECRET-VENDOR', quantity: 1, listed_price: 80, pricing_model: 'flat', price_treatment: 'listed', price_status: 'priced', line_total: 80, price_note: null, guest_fit: true }],
  excluded: [], listed_subtotal: 80, unpriced_items: 0, captured_at: '2026-11-03T00:00:00Z',
}
const ROW = {
  id: REQ_ID, status: 'pending', created_at: '2026-11-03T10:00:00Z', event_date: '2099-01-15', guest_count: '20', budget_range: '$500–$1,000', notes: 'hello',
  package_snapshot: SNAPSHOT, contact_email: 'secret@x.com', coordinator_id: 'SECRET-COORD', user_id: SESSION, selected_package_id: 'SECRET-VERSION', vendor_snapshot: { a: 1 },
}

const withRows = (data: unknown) => {
  const f = fakeSupabase({ respond: () => ({ data, error: null }) })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}
// A real NextRequest: the list route reads request.nextUrl.
const req = (url = 'http://localhost/x') => new NextRequest(url)
const idParams = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.requireUser.mockResolvedValue({ error: false, response: null, userId: SESSION })
})

describe('GET /theme-package-requests', () => {
  it("lists only the caller's package requests with summary fields", async () => {
    const f = withRows([ROW])
    const res = await listGet(req())
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.requests).toEqual([{
      id: REQ_ID, status: 'pending', created_at: '2026-11-03T10:00:00Z', event_date: '2099-01-15', guest_count: 20,
      package: { key: 'spooky_birthday', title: 'Spooky' }, listed_subtotal: 80, unpriced_items: 0,
    }])
    expect(data).toMatchObject({ has_more: false, next_offset: null })
    expect(findLeaks(data, { secrets: SECRETS, allowKeys: ['status'] })).toEqual([])
    expect(f.calls[0].eq).toEqual({ user_id: SESSION, request_source: 'theme_package' })
  })
  it('paginates', async () => {
    withRows(Array.from({ length: 51 }, (_, i) => ({ ...ROW, id: `r${i}` })))
    const { data } = await (await listGet(req('http://localhost/x?offset=50'))).json()
    expect(data.requests).toHaveLength(50)
    expect(data).toMatchObject({ has_more: true, next_offset: 100 })
  })
  it('rejects a bad offset and hides database errors', async () => {
    withRows([])
    expect((await listGet(req('http://localhost/x?offset=-1'))).status).toBe(400)
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000', message: 'secret detail' } }) })
    h.createSupabaseAdmin.mockReturnValue(f.client)
    const res = await listGet(req())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret detail')
  })
  it('401 with no DB work when requireUser fails', async () => {
    h.requireUser.mockResolvedValue({ error: true, userId: null, response: new Response('{}', { status: 401 }) })
    expect((await listGet(req())).status).toBe(401)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })
})

describe('GET /theme-package-requests/[id]', () => {
  it('returns the own request with the public snapshot projection and nothing internal', async () => {
    const f = withRows(ROW)
    const res = await detailGet(req(), idParams(REQ_ID))
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.request).toMatchObject({
      id: REQ_ID, status: 'pending', created_at: '2026-11-03T10:00:00Z', event_date: '2099-01-15', guest_count: 20,
      budget_range: '$500–$1,000', notes: 'hello', package: { key: 'spooky_birthday', title: 'Spooky' },
    })
    expect(data.request.snapshot.items[0]).toMatchObject({ catalog_item_name: 'Cake', listed_price: 80, line_total: 80 })
    expect(Object.keys(data.request).sort()).toEqual(['budget_range', 'created_at', 'event_date', 'guest_count', 'id', 'notes', 'package', 'snapshot', 'status'])
    expect(findLeaks(data, { secrets: SECRETS, allowKeys: ['status'] })).toEqual([])
    expect(f.calls[0].eq).toEqual({ id: REQ_ID, user_id: SESSION, request_source: 'theme_package' })
  })
  it("another user's request or a non-package request answers 404 (never 403), with the same body", async () => {
    withRows(null) // the query is scoped to the session user and package source, so a foreign/other row is simply not found
    const res = await detailGet(req(), idParams(REQ_ID))
    expect(res.status).toBe(404)
    const missing = JSON.stringify(await res.json())
    withRows(null)
    const malformed = await detailGet(req(), idParams('not-a-uuid'))
    expect(malformed.status).toBe(404)
    expect(JSON.stringify(await malformed.json())).toBe(missing)
  })
  it('a malformed id never reaches the database', async () => {
    const f = withRows(ROW)
    await detailGet(req(), idParams('../../x'))
    expect(f.calls).toHaveLength(0)
  })
  it('401 with no DB work when requireUser fails', async () => {
    h.requireUser.mockResolvedValue({ error: true, userId: null, response: new Response('{}', { status: 401 }) })
    expect((await detailGet(req(), idParams(REQ_ID))).status).toBe(401)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })
})
