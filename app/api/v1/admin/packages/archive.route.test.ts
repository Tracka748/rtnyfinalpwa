import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireCapability: vi.fn(),
  requireUser: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireAdmin: h.requireAdmin, requireCapability: h.requireCapability, requireUser: h.requireUser }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import { PATCH } from './[id]/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PKG = '11111111-1111-1111-1111-111111111111'
const PKG_ROW = { id: PKG, key: 'spooky_birthday', status: 'archived' }

const cards = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `card-${i}` }))

function setup(feed: (q: Recorded) => FakeResult, pkg: unknown = PKG_ROW) {
  const f = fakeSupabase({
    respond: q => (q.table === 'feed_cards' ? feed(q) : { data: pkg, error: null }),
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const patch = (body: unknown, id = PKG) =>
  PATCH(
    new Request('http://localhost/api/test', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as unknown as NextRequest,
    { params: Promise.resolve({ id }) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.requireAdmin.mockResolvedValue({ error: false, response: null, userId: SESSION })
})

describe('PATCH packages/[id] archive', () => {
  it('archives, then reports how many active feed cards still feature the package', async () => {
    const f = setup(() => ({ data: cards(3), error: null }))
    const res = await patch({ status: 'archived' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { package: PKG_ROW, active_feed_cards: 3 } })
    expect(f.calls.map(c => `${c.table}:${c.op}`)).toEqual(['theme_packages:update', 'feed_cards:select'])
    expect(f.calls[0]).toMatchObject({ payload: { status: 'archived' }, eq: { id: PKG } })
    expect(f.calls[1].eq).toEqual({ theme_package_id: PKG, active: true })
  })

  it('reports 0 when no active card features it', async () => {
    setup(() => ({ data: [], error: null }))
    expect((await (await patch({ status: 'archived' })).json()).data.active_feed_cards).toBe(0)
  })

  it('caps the count at 50', async () => {
    setup(() => ({ data: cards(75), error: null }))
    expect((await (await patch({ status: 'archived' })).json()).data.active_feed_cards).toBe(50)
    setup(() => ({ data: cards(50), error: null }))
    expect((await (await patch({ status: 'archived' })).json()).data.active_feed_cards).toBe(50)
  })

  it('a feed read error does not fail the archive: 200 with active_feed_cards null, error logged', async () => {
    setup(() => ({ data: null, error: { code: '42P01', message: 'relation "feed_cards" does not exist' } }))
    const res = await patch({ status: 'archived' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { package: PKG_ROW, active_feed_cards: null } })
    expect(console.error).toHaveBeenCalled()
  })

  it('a thrown feed read does not fail the archive either', async () => {
    setup(() => { throw new Error('network down') })
    const res = await patch({ status: 'archived' })
    expect(res.status).toBe(200)
    expect((await res.json()).data.active_feed_cards).toBeNull()
  })

  it('reactivating does not read feed cards and has no active_feed_cards key', async () => {
    const f = setup(() => ({ data: cards(2), error: null }), { ...PKG_ROW, status: 'active' })
    const res = await patch({ status: 'active' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { package: { ...PKG_ROW, status: 'active' } } })
    expect(f.calls.map(c => c.table)).toEqual(['theme_packages'])
  })

  it('404 for a missing package, with no feed read', async () => {
    const f = setup(() => ({ data: cards(1), error: null }), null)
    expect((await patch({ status: 'archived' })).status).toBe(404)
    expect(f.calls.map(c => c.table)).toEqual(['theme_packages'])
  })

  it('a failed archive update is mapped and never reaches the feed read', async () => {
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'P0001', message: 'live version must belong to this package' } }) })
    h.createSupabaseAdmin.mockReturnValue(f.client)
    const res = await patch({ status: 'archived' })
    expect(res.status).toBe(400)
    expect(f.calls.map(c => c.table)).toEqual(['theme_packages'])
  })

  it('rejects a bad body or id before any DB work', async () => {
    const f = setup(() => ({ data: [], error: null }))
    expect((await patch({ status: 'deleted' })).status).toBe(400)
    expect((await patch({ status: 'archived', key: 'x' })).status).toBe(400)
    expect((await patch({ status: 'archived' }, 'nope')).status).toBe(400)
    expect(f.calls).toHaveLength(0)
  })
})
