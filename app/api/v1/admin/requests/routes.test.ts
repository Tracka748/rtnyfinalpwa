import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireCapability: h.requireCapability }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import * as listRoute from './route'
import * as detailRoute from './[id]/route'
import * as unreadRoute from './unread-count/route'
import * as readRoute from './[id]/read/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const REQ = '11111111-1111-1111-1111-111111111111'
const LEAK = 'postgres-secret-detail'

type Ctx = { params: Promise<{ id: string }> }
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>

const req = (path: string, method = 'GET') =>
  new Request(`http://localhost${path}`, { method }) as unknown as NextRequest
const ctx = (id = REQ): Ctx => ({ params: Promise.resolve({ id }) })

function setup(rpc: (fn: string, args: Record<string, unknown>) => FakeResult = () => ({ data: null, error: null })) {
  const f = fakeSupabase({ rpc })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const allow = () => h.requireCapability.mockResolvedValue({ error: false, response: null, userId: SESSION })
const denyWith = (status: number, error: string) =>
  h.requireCapability.mockResolvedValue({
    error: true,
    userId: null,
    response: new Response(JSON.stringify({ success: false, error }), { status, headers: { 'content-type': 'application/json' } }),
  })

const cases: Array<{ name: string; call: (query?: string) => Promise<Response>; rpc: string }> = [
  { name: 'GET list', call: (qs = '') => listRoute.GET(req(`/api/v1/admin/requests${qs}`)), rpc: 'request_inbox_list' },
  { name: 'GET detail', call: (qs = '') => detailRoute.GET(req(`/api/v1/admin/requests/${REQ}${qs}`), ctx()), rpc: 'request_inbox_detail' },
  { name: 'GET unread-count', call: (qs = '') => unreadRoute.GET(req(`/api/v1/admin/requests/unread-count${qs}`)), rpc: 'request_inbox_unread_count' },
  { name: 'POST read', call: (qs = '') => (readRoute.POST as Handler)(req(`/api/v1/admin/requests/${REQ}/read${qs}`, 'POST'), ctx()), rpc: 'request_inbox_mark_read' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  allow()
})

describe.each(cases)('$name', ({ call, rpc }) => {
  it('checks events.requests.view (allow) and never reaches the RPC when denied', async () => {
    for (const [status, msg] of [[401, 'Not authenticated'], [403, 'Forbidden']] as const) {
      denyWith(status, msg)
      const f = setup()
      const res = await call('?scope=bogus&limit=0') // invalid input must not be reached before auth
      expect(res.status).toBe(status)
      expect(f.rpcCalls).toHaveLength(0)
    }
    allow()
    setup()
    await call()
    expect(h.requireCapability).toHaveBeenLastCalledWith(expect.anything(), 'events.requests.view', 'allow')
  })

  it('uses the session user as p_actor even when the query names another user', async () => {
    const f = setup(() => ({ data: rpc === 'request_inbox_detail' ? { id: REQ } : [], error: null }))
    await call(`?user_id=${OTHER}&p_actor=${OTHER}&actor=${OTHER}`)
    expect(f.rpcCalls).toHaveLength(1)
    expect(f.rpcCalls[0].fn).toBe(rpc)
    expect(f.rpcCalls[0].args.p_actor).toBe(SESSION)
    expect(JSON.stringify(f.rpcCalls[0].args)).not.toContain(OTHER)
  })

  it('maps 42501 to 403 with a fixed message', async () => {
    setup(() => ({ data: null, error: { code: '42501', message: LEAK } }))
    const res = await call()
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'Forbidden' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each([
    ['P0001', { code: 'P0001', message: LEAK }],
    ['XX000', { code: 'XX000', message: LEAK }],
    ['no code', { message: LEAK }],
  ])('maps a %s error to a generic 500 without leaking text', async (_n, error) => {
    setup(() => ({ data: null, error }))
    const res = await call()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain(LEAK)
  })

  it('maps a thrown error to a generic 500', async () => {
    h.createSupabaseAdmin.mockImplementation(() => { throw new Error(LEAK) })
    const res = await call()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain(LEAK)
  })
})

describe('GET /admin/requests (list)', () => {
  const ROW = { request_id: REQ, status: 'pending', title: 'Spooky', unread: true }

  it('passes validated params and the defaults through to the RPC', async () => {
    const f = setup(() => ({ data: [], error: null }))
    await listRoute.GET(req('/api/v1/admin/requests'))
    expect(f.rpcCalls[0].args).toEqual({ p_actor: SESSION, p_scope: 'all', p_status: undefined, p_limit: 25, p_offset: 0 })
    await listRoute.GET(req('/api/v1/admin/requests?scope=mine&status=in_progress&limit=10&offset=20'))
    expect(f.rpcCalls[1].args).toEqual({ p_actor: SESSION, p_scope: 'mine', p_status: 'in_progress', p_limit: 10, p_offset: 20 })
  })

  it('returns rows with total_count lifted out, uncached', async () => {
    setup(() => ({ data: [{ ...ROW, total_count: 7 }, { ...ROW, request_id: 'x', total_count: 7 }], error: null }))
    const res = await listRoute.GET(req('/api/v1/admin/requests?limit=2'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.total_count).toBe(7)
    expect(body.data).toMatchObject({ limit: 2, offset: 0 })
    expect(body.data.requests).toHaveLength(2)
    expect(body.data.requests[0]).toEqual(ROW)
  })

  it('returns total_count 0 for an empty result', async () => {
    setup(() => ({ data: [], error: null }))
    const body = await (await listRoute.GET(req('/api/v1/admin/requests'))).json()
    expect(body.data).toEqual({ requests: [], total_count: 0, limit: 25, offset: 0 })
  })

  it.each([
    'scope=everyone', 'status=booked', 'limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=abc',
  ])('400 for invalid %s with no RPC call', async qs => {
    const f = setup()
    const res = await listRoute.GET(req(`/api/v1/admin/requests?${qs}`))
    expect(res.status).toBe(400)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(f.rpcCalls).toHaveLength(0)
  })
})

describe('GET /admin/requests/[id] (detail)', () => {
  it('returns the detail under request, uncached, passing the id', async () => {
    const f = setup(() => ({ data: { id: REQ, contact_redacted: true }, error: null }))
    const res = await detailRoute.GET(req(`/api/v1/admin/requests/${REQ}`), ctx())
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ success: true, data: { request: { id: REQ, contact_redacted: true } } })
    expect(f.rpcCalls[0].args).toEqual({ p_actor: SESSION, p_request_id: REQ })
  })

  it('404 when the RPC returns null (missing or not visible)', async () => {
    setup(() => ({ data: null, error: null }))
    const res = await detailRoute.GET(req(`/api/v1/admin/requests/${REQ}`), ctx())
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, error: 'Request not found' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('400 for a non-uuid id with no RPC call', async () => {
    const f = setup()
    const res = await detailRoute.GET(req('/api/v1/admin/requests/nope'), ctx('nope'))
    expect(res.status).toBe(400)
    expect(f.rpcCalls).toHaveLength(0)
  })
})

describe('GET /admin/requests/unread-count', () => {
  it('returns { count }, uncached', async () => {
    setup(() => ({ data: 4, error: null }))
    const res = await unreadRoute.GET(req('/api/v1/admin/requests/unread-count'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ success: true, data: { count: 4 } })
  })
})

describe('POST /admin/requests/[id]/read', () => {
  it('returns { updated }, uncached, passing the path id', async () => {
    const f = setup(() => ({ data: 2, error: null }))
    const res = await readRoute.POST(req(`/api/v1/admin/requests/${REQ}/read`, 'POST'), ctx())
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ success: true, data: { updated: 2 } })
    expect(f.rpcCalls[0].args).toEqual({ p_actor: SESSION, p_request_id: REQ })
  })

  it('400 for a non-uuid id with no RPC call', async () => {
    const f = setup()
    const res = await readRoute.POST(req('/api/v1/admin/requests/nope/read', 'POST'), ctx('nope'))
    expect(res.status).toBe(400)
    expect(f.rpcCalls).toHaveLength(0)
  })
})

describe('method surface', () => {
  it('exports only the intended HTTP methods', () => {
    const methods = (m: Record<string, unknown>) =>
      Object.keys(m).filter(k => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(k))
    expect(methods(listRoute)).toEqual(['GET'])
    expect(methods(detailRoute)).toEqual(['GET'])
    expect(methods(unreadRoute)).toEqual(['GET'])
    expect(methods(readRoute)).toEqual(['POST'])
  })
})
