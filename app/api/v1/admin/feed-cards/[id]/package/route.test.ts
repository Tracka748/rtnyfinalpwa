import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ checkIsAdmin: vi.fn(), createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ checkIsAdmin: h.checkIsAdmin }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import * as route from './route'

const CARD = '11111111-1111-1111-1111-111111111111'
const PKG = '22222222-2222-2222-2222-222222222222'
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

interface Opts { pkg?: unknown; update?: FakeResult }
function setup(o: Opts = {}) {
  const f = fakeSupabase({
    respond: (q: Recorded) => {
      if (q.table === 'theme_packages') return { data: 'pkg' in o ? o.pkg : { id: PKG, status: 'active', live_version_id: 'v1' }, error: null }
      return o.update ?? { data: { id: CARD, theme_package_id: PKG }, error: null }
    },
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const put = (body: unknown, id = CARD, raw?: BodyInit) =>
  route.PUT(
    new NextRequest('http://localhost/x', { method: 'PUT', body: raw ?? JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
    { params: Promise.resolve({ id }) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.checkIsAdmin.mockResolvedValue({ error: false, response: null })
})

describe('wiring', () => {
  it('only PUT is exported', () => {
    expect(Object.keys(route).filter(k => HTTP_METHODS.includes(k))).toEqual(['PUT'])
  })
  for (const status of [401, 403]) {
    it(`returns ${status} with no DB work and the body unread when the admin check fails`, async () => {
      h.checkIsAdmin.mockResolvedValue({ error: true, response: new Response(JSON.stringify({ error: 'denied' }), { status }) })
      const req = new NextRequest('http://localhost/x', { method: 'PUT', body: JSON.stringify({ theme_package_id: PKG }) })
      const res = await route.PUT(req, { params: Promise.resolve({ id: CARD }) })
      expect(res.status).toBe(status)
      expect(h.checkIsAdmin).toHaveBeenCalledTimes(1)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
      expect(req.bodyUsed).toBe(false)
    })
  }
})

describe('PUT /admin/feed-cards/[id]/package', () => {
  it('attaches a live package, writing only theme_package_id', async () => {
    const f = setup()
    const res = await put({ theme_package_id: PKG })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { card: { id: CARD, theme_package_id: PKG } } })
    const write = f.calls.find(c => c.table === 'feed_cards')!
    expect(write.op).toBe('update')
    expect(write.payload).toEqual({ theme_package_id: PKG }) // no other column
    expect(write.eq).toEqual({ id: CARD })
  })
  it('detaches with null and skips the package check', async () => {
    const f = setup({ update: { data: { id: CARD, theme_package_id: null }, error: null } })
    const res = await put({ theme_package_id: null })
    expect(res.status).toBe(200)
    expect(f.calls.map(c => c.table)).toEqual(['feed_cards'])
    expect(f.calls[0].payload).toEqual({ theme_package_id: null })
  })
  it('400 for a package that is not live, with no write', async () => {
    for (const pkg of [{ id: PKG, status: 'archived', live_version_id: 'v1' }, { id: PKG, status: 'active', live_version_id: null }, null]) {
      const f = setup({ pkg })
      const res = await put({ theme_package_id: PKG })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('This package is not live and cannot be featured')
      expect(f.calls.some(c => c.table === 'feed_cards')).toBe(false)
    }
  })
  it('404 when the card does not exist', async () => {
    setup({ update: { data: null, error: null } })
    expect((await put({ theme_package_id: PKG })).status).toBe(404)
  })
  it('maps the trigger error (P0001) to 400 with its message', async () => {
    setup({ update: { data: null, error: { code: 'P0001', message: 'package is not live and cannot be featured' } } })
    const res = await put({ theme_package_id: PKG })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('package is not live and cannot be featured')
  })
  it('hides other database errors', async () => {
    setup({ update: { data: null, error: { code: 'XX000', message: 'relation "feed_cards" secret detail' } } })
    const res = await put({ theme_package_id: PKG })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret detail')
  })
  it.each(['user_id', 'created_by', 'updated_by', 'actor', 'headline', 'type', 'active', 'cta_url', 'event_id', 'id'])(
    'rejects a body "%s" key with 400 before any DB work',
    async key => {
      const f = setup()
      const res = await put({ theme_package_id: PKG, [key]: 'x' })
      expect(res.status).toBe(400)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
      expect(f.calls).toHaveLength(0)
    }
  )
  it('400 for a bad card id, a bad package id, a missing key and invalid JSON, before any DB work', async () => {
    const f = setup()
    expect((await put({ theme_package_id: PKG }, 'nope')).status).toBe(400)
    expect((await put({ theme_package_id: 'nope' })).status).toBe(400)
    expect((await put({})).status).toBe(400)
    expect((await put(null, CARD, '{nope')).status).toBe(400)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.calls).toHaveLength(0)
  })
})
