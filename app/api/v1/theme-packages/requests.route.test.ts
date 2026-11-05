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
const RESERVATION_KEYS = ['balance', 'balance_due_date', 'deposit', 'extra_guests', 'extras_total', 'guest_count', 'mode', 'service_charge', 'subtotal', 'total']
const STORED_RESERVATION = {
  mode: 'structured', guest_count: 20, extra_guests: 10, extras_total: 300, subtotal: 975, service_charge: 195, total: 1170,
  deposit: 200, balance: 970, balance_due_date: '2099-01-05', terms: { mode: 'structured', base_price: 675, notes: ['SECRET-NOTE'] },
}
const BODY = { version_id: VERSION_ID, selection: SELECTION, event_date: '2099-01-15', guest_count: 20, budget_range: '$500–$1,000', notes: 'hello' }

interface Opts {
  pkg?: unknown
  version?: unknown
  recent?: unknown[]
  dup?: unknown[]
  rpc?: FakeResult
  user?: unknown
  readback?: FakeResult
}

function setup(o: Opts = {}) {
  const f = fakeSupabase({
    respond: (q: Recorded) => {
      if (q.table === 'theme_packages') return { data: 'pkg' in o ? o.pkg : PKG, error: null }
      if (q.table === 'theme_package_versions') return { data: 'version' in o ? o.version : VERSION, error: null }
      // the post-create read-back of the stored row (request_kind + snapshot)
      if (q.table === 'plan_requests' && q.eq.id === NEW_ID) return o.readback ?? { data: { request_kind: 'custom_quote', package_snapshot: null }, error: null }
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
    expect(await res.json()).toEqual({ success: true, data: { request_id: NEW_ID, request_kind: 'custom_quote', reservation: null } })
    expect(f.rpcCalls).toEqual([{
      fn: 'theme_package_create_request',
      args: {
        p_user_id: SESSION, p_version_id: VERSION_ID, p_selection: SELECTION, p_event_date: '2099-01-15',
        p_guest_count: 20, p_budget_range: '$500–$1,000', p_notes: 'hello', p_contact_email: 'real@user.com',
        p_event_type: null, p_intent: 'quote',
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
    // the two abuse reads (the post-create read-back is filtered by id and covered in the reserve tests)
    const reads = f.calls.filter(c => c.table === 'plan_requests' && !('id' in c.eq))
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

describe('POST /theme-packages/[key]/requests: optional budget and event type', () => {
  const RPC_KEYS = ['p_budget_range', 'p_contact_email', 'p_event_date', 'p_event_type', 'p_guest_count', 'p_intent', 'p_notes', 'p_selection', 'p_user_id', 'p_version_id']
  const updates = (f: ReturnType<typeof setup>) => f.calls.filter(c => c.table === 'plan_requests' && c.op === 'update')

  it('accepts a request without a budget and passes null to the function', async () => {
    const { budget_range: _b, ...noBudget } = BODY
    const f = setup()
    const res = await send(noBudget)
    expect(res.status).toBe(201)
    expect(f.rpcCalls[0].args.p_budget_range).toBeNull()
  })
  it('treats an empty or blank budget as null', async () => {
    for (const b of ['', '   ', null]) {
      const f = setup()
      expect((await send({ ...BODY, budget_range: b })).status).toBe(201)
      expect(f.rpcCalls[0].args.p_budget_range).toBeNull()
    }
  })
  it('an invalid budget is a 400 before any DB work', async () => {
    const f = setup()
    expect((await send({ ...BODY, budget_range: 'cheap' })).status).toBe(400)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.rpcCalls).toHaveLength(0)
  })
  it('without an event_type (or a blank one) passes null so the function keeps the package occasion: no update is made', async () => {
    for (const body of [BODY, { ...BODY, event_type: '' }, { ...BODY, event_type: '   ' }, { ...BODY, event_type: null }]) {
      const f = setup()
      expect((await send(body)).status).toBe(201)
      expect(f.rpcCalls[0].args.p_event_type).toBeNull()
      expect(updates(f)).toHaveLength(0)
    }
  })
  it('a custom event_type is passed (trimmed) to the function, which stores it atomically: no update query is made', async () => {
    const f = setup()
    const res = await send({ ...BODY, event_type: '  Baby shower  ' })
    expect(res.status).toBe(201)
    expect(f.rpcCalls[0].args.p_event_type).toBe('Baby shower')
    expect(updates(f)).toHaveLength(0)
  })
  it('the function call has exactly these ten server-controlled arguments (the original eight plus p_event_type and p_intent)', async () => {
    const f = setup()
    await send({ ...BODY, event_type: 'Baby shower' })
    expect(Object.keys(f.rpcCalls[0].args).sort()).toEqual(RPC_KEYS)
    expect(f.rpcCalls[0].args).toMatchObject({ p_user_id: SESSION, p_version_id: VERSION_ID, p_contact_email: 'real@user.com' })
  })
  it('a custom event_type does not influence which package is resolved', async () => {
    const f = setup()
    await send({ ...BODY, event_type: 'other_package' })
    expect(f.calls.find(c => c.table === 'theme_packages')!.eq).toEqual({ key: 'spooky_birthday' })
  })
  it('an event_type equal to the package occasion is still passed to the function, and no update is made', async () => {
    const f = setup()
    await send({ ...BODY, event_type: 'Birthday' })
    expect(f.rpcCalls[0].args.p_event_type).toBe('Birthday')
    expect(updates(f)).toHaveLength(0)
  })
  it('81 characters or control characters are rejected before any DB work', async () => {
    const f = setup()
    expect((await send({ ...BODY, event_type: 'x'.repeat(81) })).status).toBe(400)
    expect((await send({ ...BODY, event_type: 'bad\nvalue' })).status).toBe(400)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.rpcCalls).toHaveLength(0)
  })
  it('if the read-back of the stored row fails the request still succeeds, with request_kind from the intent and no reservation, and the failure is logged', async () => {
    for (const readback of [{ data: null, error: { code: 'XX000', message: 'boom' } }, { data: null, error: null }]) {
      for (const [intent, kind] of [['quote', 'custom_quote'], ['reserve', 'reserve']]) {
        const f = setup({ readback })
        const res = await send({ ...BODY, intent })
        expect(res.status).toBe(201)
        expect((await res.json()).data).toEqual({ request_id: NEW_ID, request_kind: kind, reservation: null })
        expect(updates(f)).toHaveLength(0)
        expect(console.error).toHaveBeenCalled()
      }
    }
  })
  it('a duplicate within 2 minutes is still a duplicate when only the budget or event_type differ', async () => {
    const f = setup({ dup: [{ id: DUP_ID }] })
    for (const patch of [{ budget_range: '$5,000+' }, { budget_range: '' }, { event_type: 'Something else' }]) {
      const res = await send({ ...BODY, ...patch })
      expect(res.status).toBe(409)
      expect((await res.json()).request_id).toBe(DUP_ID)
    }
    expect(f.rpcCalls).toHaveLength(0)
    expect(updates(f)).toHaveLength(0)
  })
  it.each(['occasion', 'package_id', 'package_key', 'event_subtype', 'eventType', 'snapshot', 'user_id', 'email'])(
    'still rejects a body "%s" key before any DB work', async key => {
      setup()
      expect((await send({ ...BODY, [key]: 'x' })).status).toBe(400)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    }
  )
})

describe('POST /theme-packages/[key]/requests: reserve intent', () => {
  const reservedRow = { request_kind: 'reserve', package_snapshot: { snapshot_version: 3, reservation: STORED_RESERVATION, package_id: 'SECRET-PKG' } }
  const SECRET_JSON = ['SECRET-NOTE', 'SECRET-PKG', 'base_price']

  it('reserve success: passes p_intent, returns request_kind and only the allowlisted reservation numbers', async () => {
    const f = setup({ readback: { data: reservedRow, error: null } })
    const res = await send({ ...BODY, intent: 'reserve' })
    expect(res.status).toBe(201)
    const { data } = await res.json()
    expect(f.rpcCalls[0].args.p_intent).toBe('reserve')
    expect(data.request_id).toBe(NEW_ID)
    expect(data.request_kind).toBe('reserve')
    expect(Object.keys(data.reservation).sort()).toEqual(RESERVATION_KEYS)
    expect(data.reservation).toMatchObject({ total: 1170, deposit: 200, balance: 970, balance_due_date: '2099-01-05' })
    const json = JSON.stringify(data)
    for (const x of SECRET_JSON) expect(json).not.toContain(x)
    expect(Object.keys(data).sort()).toEqual(['request_id', 'request_kind', 'reservation'])
  })
  it('reads the stored row back scoped to the new request id and the session user', async () => {
    const f = setup({ readback: { data: reservedRow, error: null } })
    await send({ ...BODY, intent: 'reserve' })
    const read = f.calls.find(c => c.table === 'plan_requests' && c.eq.id === NEW_ID)!
    expect(read.op).toBe('select')
    expect(read.eq).toEqual({ id: NEW_ID, user_id: SESSION })
  })
  it('a free-text reservation returns the mode only', async () => {
    setup({ readback: { data: { request_kind: 'reserve', package_snapshot: { reservation: { mode: 'free_text', terms: { free_text: 'SECRET-NOTE' } } } }, error: null } })
    const { data } = await (await send({ ...BODY, intent: 'reserve' })).json()
    expect(data.reservation).toEqual({ mode: 'free_text' })
  })
  it('reserve with a customized selection: the function error is mapped to 400 with its message', async () => {
    setup({ rpc: { data: null, error: { code: 'P0001', message: 'a customized package is requested as a quote, not a reservation' } } })
    const res = await send({ ...BODY, intent: 'reserve' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('a customized package is requested as a quote, not a reservation')
  })
  it('reserve against a package without pricing terms: 400 with the function message', async () => {
    setup({ rpc: { data: null, error: { code: 'P0001', message: 'this package cannot be reserved directly; request a quote instead' } } })
    const res = await send({ ...BODY, intent: 'reserve' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('this package cannot be reserved directly; request a quote instead')
  })
  it('the default intent is quote: the function receives p_intent "quote" and the kind is custom_quote', async () => {
    const f = setup()
    const res = await send(BODY)
    expect(f.rpcCalls[0].args.p_intent).toBe('quote')
    expect((await res.json()).data.request_kind).toBe('custom_quote')
    const g = setup()
    await send({ ...BODY, intent: 'quote' })
    expect(g.rpcCalls[0].args.p_intent).toBe('quote')
  })
  it('an invalid intent is a 400 before any DB work', async () => {
    const f = setup()
    for (const intent of ['buy', 'RESERVE', '', null, 5]) expect((await send({ ...BODY, intent })).status).toBe(400)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(f.rpcCalls).toHaveLength(0)
  })
  it('reserve with a guest count outside the version min/max is a 400 with no abuse reads and no function call', async () => {
    const version = { ...VERSION, min_guests: 10, max_guests: 30 }
    for (const guest_count of [9, 31]) {
      const f = setup({ version })
      const res = await send({ ...BODY, guest_count, intent: 'reserve' })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe("guest count is outside this package's range")
      expect(f.rpcCalls).toHaveLength(0)
      expect(f.calls.some(c => c.table === 'plan_requests')).toBe(false)
    }
    for (const guest_count of [10, 30]) {
      const f = setup({ version })
      expect((await send({ ...BODY, guest_count, intent: 'reserve' })).status).toBe(201)
      expect(f.rpcCalls).toHaveLength(1)
    }
  })
  it('a missing date or guest count is still a 400 for reserve, before any DB work', async () => {
    const { event_date: _d, ...noDate } = BODY
    const { guest_count: _g, ...noGuests } = BODY
    setup()
    expect((await send({ ...noDate, intent: 'reserve' })).status).toBe(400)
    expect((await send({ ...noGuests, intent: 'reserve' })).status).toBe(400)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })
  it('keeps the other rules for reserve: stale version 409, duplicate 409, unverified email 403', async () => {
    setup()
    expect((await send({ ...BODY, intent: 'reserve', version_id: OTHER })).status).toBe(409)
    const d = setup({ dup: [{ id: DUP_ID }] })
    expect((await send({ ...BODY, intent: 'reserve' })).status).toBe(409)
    expect(d.rpcCalls).toHaveLength(0)
    const e = setup({ user: { id: SESSION, email: 'a@b.com', email_confirmed_at: null } })
    expect((await send({ ...BODY, intent: 'reserve' })).status).toBe(403)
    expect(e.rpcCalls).toHaveLength(0)
  })
})
