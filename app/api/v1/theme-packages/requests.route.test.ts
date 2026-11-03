import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

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

import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import { POST } from './[key]/requests/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const VERSION_ID = '22222222-2222-2222-2222-222222222222'
const COMP_ID = '33333333-3333-3333-3333-333333333333'
const NEW_ID = '44444444-4444-4444-4444-444444444444'
const DUP_ID = '55555555-5555-5555-5555-555555555555'
const PKG = { id: 'pkg-1', key: 'spooky_birthday', occasion: 'Birthday', status: 'active', theme_id: null, live_version_id: VERSION_ID }
const VERSION = { id: VERSION_ID, title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: null, max_guests: null, published_at: null }
const SELECTION = { components: [{ component_id: COMP_ID, included: true }] }
const BODY = { version_id: VERSION_ID, selection: SELECTION, event_date: '2099-01-15', guest_count: 20, budget_range: '$500–$1,000', notes: 'hello' }

interface Opts {
  pkg?: unknown
  version?: unknown
  recent?: unknown[]
  dup?: unknown[]
  rpc?: FakeResult
  user?: unknown
}

function setup(o: Opts = {}) {
  const f = fakeSupabase({
    respond: (q: Recorded) => {
      if (q.table === 'theme_packages') return { data: 'pkg' in o ? o.pkg : PKG, error: null }
      if (q.table === 'theme_package_versions') return { data: 'version' in o ? o.version : VERSION, error: null }
      if (q.table === 'plan_requests') return { data: 'selected_package_id' in q.eq ? o.dup ?? [] : o.recent ?? [], error: null }
      return { data: null, error: null }
    },
    rpc: () => o.rpc ?? { data: NEW_ID, error: null },
    user: () => ({ data: { user: 'user' in o ? o.user : { id: SESSION, email: 'real@user.com', email_confirmed_at: '2026-01-01' } }, error: null }),
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const send = (body: unknown, key = 'spooky_birthday') =>
  POST(
    new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as unknown as NextRequest,
    { params: Promise.resolve({ key }) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.requireUser.mockResolvedValue({ error: false, response: null, userId: SESSION })
})

describe('POST /theme-packages/[key]/requests', () => {
  it('creates the request: user id and email come from the session/account, never the body', async () => {
    const f = setup()
    const res = await send(BODY)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ success: true, data: { request_id: NEW_ID } })
    expect(f.rpcCalls).toEqual([{
      fn: 'theme_package_create_request',
      args: {
        p_user_id: SESSION, p_version_id: VERSION_ID, p_selection: SELECTION, p_event_date: '2099-01-15',
        p_guest_count: 20, p_budget_range: '$500–$1,000', p_notes: 'hello', p_contact_email: 'real@user.com',
      },
    }])
  })

  it.each(['user_id', 'p_user_id', 'email', 'contact_email', 'price', 'listed_price', 'service_id', 'partner_id', 'vendor_id', 'snapshot', 'package_snapshot'])(
    'rejects a body "%s" key with 400 before any DB work',
    async key => {
      const f = setup()
      const res = await send({ ...BODY, [key]: OTHER })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toContain('Unknown field')
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
      expect(f.rpcCalls).toHaveLength(0)
    }
  )

  it('rejects a bad body field (past date, budget, guests, selection) before any DB work', async () => {
    const f = setup()
    for (const patch of [{ event_date: '2020-01-01' }, { budget_range: 'cheap' }, { guest_count: 0 }, { selection: { components: [{ component_id: COMP_ID }, { component_id: COMP_ID }] } }]) {
      expect((await send({ ...BODY, ...patch })).status).toBe(400)
    }
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('409 when version_id is not the live version, without abuse reads or the rpc', async () => {
    const f = setup()
    const res = await send({ ...BODY, version_id: OTHER })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('This package was updated; reload it and try again')
    expect(f.rpcCalls).toHaveLength(0)
    expect(f.calls.some(c => c.table === 'plan_requests')).toBe(false)
  })

  it('429 at 10 requests in 24h, without the rpc', async () => {
    const f = setup({ recent: Array.from({ length: 10 }, (_, i) => ({ id: `r${i}` })) })
    const res = await send(BODY)
    expect(res.status).toBe(429)
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('409 with the earlier request id for the same version within 2 minutes, without the rpc', async () => {
    const f = setup({ dup: [{ id: DUP_ID }] })
    const res = await send(BODY)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ success: false, error: 'You already sent this request a moment ago', request_id: DUP_ID })
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('scopes the abuse reads to the session user', async () => {
    const f = setup()
    await send(BODY)
    const reads = f.calls.filter(c => c.table === 'plan_requests')
    expect(reads).toHaveLength(2)
    for (const r of reads) expect(r.eq).toMatchObject({ user_id: SESSION, request_source: 'theme_package' })
  })

  it('403 when the account email is unverified or missing, without the rpc', async () => {
    for (const user of [{ id: SESSION, email: 'a@b.com', email_confirmed_at: null }, { id: SESSION, email: null, email_confirmed_at: '2026-01-01' }, null]) {
      const f = setup({ user })
      const res = await send(BODY)
      expect(res.status).toBe(403)
      expect(f.rpcCalls).toHaveLength(0)
    }
  })

  it('404 (same response) for unknown, archived, not-live and malformed keys, with no rpc', async () => {
    const bodies: string[] = []
    for (const [o, key] of [[{ pkg: null }, 'nope'], [{ pkg: { ...PKG, status: 'archived' } }, 'spooky_birthday'], [{ pkg: { ...PKG, live_version_id: null } }, 'spooky_birthday'], [{ version: null }, 'spooky_birthday'], [{}, 'Bad-Key']] as Array<[Opts, string]>) {
      const f = setup(o)
      const res = await send(BODY, key)
      expect(res.status).toBe(404)
      bodies.push(JSON.stringify(await res.json()))
      expect(f.rpcCalls).toHaveLength(0)
    }
    expect(new Set(bodies).size).toBe(1)
  })

  it('maps function errors: P0001 -> 400 with the message, others -> generic 500 with no raw text', async () => {
    setup({ rpc: { data: null, error: { code: 'P0001', message: 'selected option does not belong to component "Cake"' } } })
    const bad = await send(BODY)
    expect(bad.status).toBe(400)
    expect((await bad.json()).error).toBe('selected option does not belong to component "Cake"')
    setup({ rpc: { data: null, error: { code: 'XX000', message: 'insert into plan_requests secret detail' } } })
    const boom = await send(BODY)
    expect(boom.status).toBe(500)
    expect(JSON.stringify(await boom.json())).not.toContain('secret detail')
    setup({ rpc: { data: null, error: { code: '42501', message: 'unknown user' } } })
    expect((await send(BODY)).status).toBe(403)
  })

  it('returns the auth response (and does nothing else) when requireUser fails', async () => {
    h.requireUser.mockResolvedValue({ error: true, userId: null, response: new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), { status: 401 }) })
    const f = setup()
    const res = await send(BODY)
    expect(res.status).toBe(401)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.rpcCalls).toHaveLength(0)
  })
})
