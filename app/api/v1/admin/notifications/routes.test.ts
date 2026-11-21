import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

// The real requireAdmin runs: only the session lookup and the database client are replaced.
const h = vi.hoisted(() => ({ getUser: vi.fn(), createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ auth: { getUser: h.getUser } })) }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))
vi.mock('@/lib/notifications/outbox', () => ({ scheduleOutbox: vi.fn() }))

import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import * as healthRoute from './health/route'
import * as requeueRoute from './requeue/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ID1 = '11111111-1111-1111-1111-111111111111'
const ID2 = '22222222-2222-2222-2222-222222222222'
const LEAK = 'PGSECRET detail from postgres'
const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const ZERO = { pending: 0, failed_7d: 0, skipped_7d: 0, sent_24h: 0 }

const healthPayload = () => ({
  pending: 0, pending_due: 0, sending: 0, sending_expired: 0, failed_24h: 0, failed_7d: 0, skipped_7d: 0, sent_24h: 2,
  oldest_due_pending_s: null, oldest_sending_s: null, last_sent_at: new Date().toISOString(),
  last_run_ok_at: new Date().toISOString(), cron_readable: true,
  failed_by_error: {}, skipped_by_error: {}, by_kind: { new_request: { ...ZERO, sent_24h: 2 } },
  requeueable_ids: [], requeueable_count: 0, app_url_waiting: 0, generated_at: new Date().toISOString(),
})

interface Opts {
  signedIn?: boolean
  admin?: FakeResult
  health?: FakeResult
  requeue?: FakeResult | 'throw'
  appUrl?: FakeResult
}

function setup(o: Opts = {}) {
  h.getUser.mockResolvedValue(
    o.signedIn === false
      ? { data: { user: null }, error: { message: 'no session' } }
      : { data: { user: { id: SESSION } }, error: null }
  )
  const f = fakeSupabase({
    rpc: fn => {
      if (fn === 'tp_is_admin') return o.admin ?? { data: true, error: null }
      if (fn === 'request_notifications_health') return o.health ?? { data: healthPayload(), error: null }
      if (fn === 'request_notifications_requeue') {
        if (o.requeue === 'throw') throw new Error(LEAK)
        return o.requeue ?? { data: { requested: 2, requeued: 2, skipped: 0 }, error: null }
      }
      if (fn === 'request_notifications_requeue_app_url') return o.appUrl ?? { data: { requeued: 3, skipped: 0, remaining: 0 }, error: null }
      return { data: null, error: null }
    },
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const fns = (f: ReturnType<typeof setup>) => f.rpcCalls.map(c => c.fn)
const rpcArgs = (f: ReturnType<typeof setup>, fn: string) => f.rpcCalls.filter(c => c.fn === fn).map(c => c.args)
const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

const getHealth = () => healthRoute.GET(new Request('http://localhost/api/v1/admin/notifications/health') as unknown as NextRequest)
const postRequeue = (body: unknown) =>
  requeueRoute.POST(new Request('http://localhost/api/v1/admin/notifications/requeue', {
    method: 'POST',
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /notifications/health', () => {
  it('401 when signed out, 403 for a non-admin: never reaches the health function, both no-store', async () => {
    let f = setup({ signedIn: false })
    let res = await getHealth()
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(f.rpcCalls).toHaveLength(0)

    f = setup({ admin: { data: false, error: null } })
    res = await getHealth()
    expect(res.status).toBe(403)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(fns(f)).toEqual(['tp_is_admin'])
  })

  it('403 when the admin check itself errors (fails closed)', async () => {
    const f = setup({ admin: { data: null, error: { code: 'XX000', message: LEAK } } })
    const res = await getHealth()
    expect(res.status).toBe(403)
    expect(fns(f)).toEqual(['tp_is_admin'])
    expect(await res.text()).not.toContain(LEAK)
  })

  it('returns the view model for an admin, no-store', async () => {
    const f = setup()
    const res = await getHealth()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(body.success).toBe(true)
    expect(body.data.health.status).toBe('healthy')
    expect(body.data.health.counts.sent24h).toBe(2)
    expect(fns(f)).toEqual(['tp_is_admin', 'request_notifications_health'])
  })

  it('a database error is a fixed 500; only the code is logged', async () => {
    setup({ health: { data: null, error: { code: 'XX000', message: LEAK } } })
    const res = await getHealth()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not load delivery health' })
    expect(logged()).toContain('XX000')
    expect(logged()).not.toContain(LEAK)
  })

  it('an unexpected result shape is a fixed 500', async () => {
    setup({ health: { data: { pending: 'many' }, error: null } })
    const res = await getHealth()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Could not load delivery health' })
  })
})

describe('POST /notifications/requeue: guard', () => {
  it('401 when signed out and 403 for a non-admin, before the body is read and without any requeue call', async () => {
    let f = setup({ signedIn: false })
    let res = await postRequeue('this is not json')
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(f.rpcCalls).toHaveLength(0)

    f = setup({ admin: { data: false, error: null } })
    res = await postRequeue({ mode: 'failed', ids: [ID1] })
    expect(res.status).toBe(403)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(fns(f)).toEqual(['tp_is_admin'])
  })
})

describe('POST /notifications/requeue: input', () => {
  it('passes the session user as the actor and the de-duplicated, lowercased ids', async () => {
    const f = setup()
    const res = await postRequeue({ mode: 'failed', ids: [ID1, ID1.toUpperCase(), ID2] })
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(rpcArgs(f, 'request_notifications_requeue')).toEqual([{ p_actor: SESSION, p_ids: [ID1, ID2] }])
    expect(await res.json()).toEqual({ success: true, data: { requeued: 2, skipped: 0, remaining: null } })
  })

  it('accepts 100 ids and rejects 101 before any requeue call', async () => {
    let f = setup()
    let res = await postRequeue({ mode: 'failed', ids: Array.from({ length: 100 }, (_, i) => uuid(i + 1)) })
    expect(res.status).toBe(200)
    expect(rpcArgs(f, 'request_notifications_requeue')).toHaveLength(1)

    vi.clearAllMocks()
    f = setup()
    res = await postRequeue({ mode: 'failed', ids: Array.from({ length: 101 }, (_, i) => uuid(i + 1)) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ success: false, error: 'At most 100 ids per request' })
    expect(fns(f)).toEqual(['tp_is_admin'])
  })

  it.each([
    ['invalid JSON', 'not json'],
    ['a JSON array', [ID1]],
    ['an unknown field', { mode: 'failed', ids: [ID1], extra: 1 }],
    ['a non-uuid id', { mode: 'failed', ids: ['x'] }],
    ['an empty id list', { mode: 'failed', ids: [] }],
    ['no ids', { mode: 'failed' }],
    ['an unknown mode', { mode: 'all' }],
    ['no mode', { ids: [ID1] }],
    ['ids with app_url', { mode: 'app_url', ids: [ID1] }],
  ])('400 for %s, and no requeue call', async (_name, body) => {
    const f = setup()
    const res = await postRequeue(body)
    expect(res.status).toBe(400)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(fns(f)).toEqual(['tp_is_admin'])
  })

  it('app_url mode calls only the app_url function, with the actor', async () => {
    const f = setup()
    const res = await postRequeue({ mode: 'app_url' })
    expect(res.status).toBe(200)
    expect(fns(f)).toEqual(['tp_is_admin', 'request_notifications_requeue_app_url'])
    expect(rpcArgs(f, 'request_notifications_requeue_app_url')).toEqual([{ p_actor: SESSION }])
    expect(await res.json()).toEqual({ success: true, data: { requeued: 3, skipped: 0, remaining: 0 } })
  })
})

describe('POST /notifications/requeue: failures never expose database text', () => {
  it.each([
    ['42501', 403, 'Forbidden'],
    ['22023', 400, 'Invalid request'],
    ['XX000', 500, 'Something went wrong'],
    ['not a code!', 500, 'Something went wrong'],
  ])('maps database code %s to %i with fixed text', async (code, status, message) => {
    setup({ requeue: { data: null, error: { code, message: LEAK } } })
    const res = await postRequeue({ mode: 'failed', ids: [ID1] })
    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ success: false, error: message })
    expect(logged()).not.toContain(LEAK)
  })

  it('the same for the app_url function', async () => {
    setup({ appUrl: { data: null, error: { code: '42501', message: LEAK } } })
    const res = await postRequeue({ mode: 'app_url' })
    expect(res.status).toBe(403)
    expect(JSON.stringify(await res.json())).not.toContain(LEAK)
    expect(logged()).not.toContain(LEAK)
  })

  it('an unexpected result shape or a thrown error is a fixed 500', async () => {
    setup({ requeue: { data: { requeued: 'two' }, error: null } })
    let res = await postRequeue({ mode: 'failed', ids: [ID1] })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })

    setup({ requeue: 'throw' })
    res = await postRequeue({ mode: 'failed', ids: [ID1] })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
    expect(logged()).not.toContain(LEAK)
  })
})
