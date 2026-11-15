import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const h = vi.hoisted(() => ({ requireUser: vi.fn(), createSupabaseAdmin: vi.fn() }))

vi.mock('@/lib/authz', () => ({ requireUser: h.requireUser }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import { POST } from './route'

const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BIZ = '11111111-1111-4111-8111-111111111111'
const LEAK = 'PGSECRET detail from postgres'

const today = new Date().toISOString().slice(0, 10)
const validBody = () => ({
  plan_date: today,
  stops: [{ business_id: BIZ, name: 'Cafe', category: 'cafe', address: null, estimated_arrival: '12:00', duration_minutes: 60, estimated_spend: 20, segment: 'afternoon' }],
  budget: 'Under $50', energy_type: 'relaxed', group_type: ['solo'], tags: ['food'], time_start: '12:00', time_end: '23:00', transportation: 'car',
})

const req = (body: unknown) =>
  new Request('http://localhost/api/v1/plan/day/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest

function setup(o: { count?: FakeResult & { count?: number | null }; insert?: FakeResult } = {}) {
  const f = fakeSupabase({
    respond: q => {
      if (q.table === 'day_plans' && q.op === 'select') return (o.count ?? { data: null, error: null, count: 0 }) as FakeResult
      if (q.table === 'day_plans' && q.op === 'insert') return o.insert ?? { data: { id: 'plan-1' }, error: null }
      return { data: null, error: null }
    },
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

beforeEach(() => {
  h.requireUser.mockReset()
  h.createSupabaseAdmin.mockReset()
  h.requireUser.mockResolvedValue({ error: false, response: null, userId: SESSION })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function call(body: unknown) {
  const r = await POST(req(body))
  const text = await r.text()
  return { status: r.status, cache: r.headers.get('Cache-Control'), text, json: JSON.parse(text) }
}

describe('POST /api/v1/plan/day/save', () => {
  it('401 with no-store when signed out, and never touches the database', async () => {
    h.requireUser.mockResolvedValue({ error: true, userId: null, response: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) })
    const f = setup()
    const r = await call(validBody())
    expect(r.status).toBe(401)
    expect(r.cache).toBe('no-store')
    expect(f.calls).toHaveLength(0)
  })

  it('saves with the session user id and server-computed totals, returning only the id', async () => {
    const f = setup()
    const r = await call(validBody())
    expect(r.status).toBe(200)
    expect(r.cache).toBe('no-store')
    expect(r.json).toEqual({ success: true, data: { id: 'plan-1' } })
    const ins = f.calls.find(c => c.op === 'insert')!
    const row = ins.payload as Record<string, unknown>
    expect(row.user_id).toBe(SESSION)
    expect(row.total_estimated_spend).toBe(20)
    expect(row.total_duration_minutes).toBe(60)
    expect(row).not.toHaveProperty('id')
    expect(row.status).toBe('saved')
    const count = f.calls.find(c => c.op === 'select')!
    expect(count.eq).toEqual({ user_id: SESSION })
  })

  it('rejects client-supplied user_id, id, totals and image URLs with a fixed 400', async () => {
    const f = setup()
    for (const extra of [{ user_id: 'x' }, { id: 'x' }, { total_estimated_spend: 1 }, { status: 'paid' }]) {
      const r = await call({ ...validBody(), ...extra })
      expect(r.status).toBe(400)
      expect(r.json).toEqual({ success: false, error: 'Invalid plan' })
    }
    const withLogo = validBody()
    ;(withLogo.stops[0] as Record<string, unknown>).logo_url = 'https://evil/x.png'
    expect((await call(withLogo)).status).toBe(400)
    expect(f.calls.filter(c => c.op === 'insert')).toHaveLength(0)
  })

  it('always writes status saved, and a client-sent status is rejected whatever its value', async () => {
    const f = setup()
    for (const status of ['saved', 'generated', 'completed', 'paid', null]) {
      const r = await call({ ...validBody(), status })
      expect(r.status, String(status)).toBe(400)
      expect(r.json).toEqual({ success: false, error: 'Invalid plan' })
    }
    expect(f.calls.filter(c => c.op === 'insert')).toHaveLength(0)
    await call(validBody())
    const row = f.calls.find(c => c.op === 'insert')!.payload as Record<string, unknown>
    expect(row.status).toBe('saved')
  })

  it('400 for invalid JSON and 413 for an oversized body', async () => {
    setup()
    const bad = await call('{oops')
    expect(bad.status).toBe(400)
    expect(bad.cache).toBe('no-store')
    const big = validBody()
    big.stops[0].name = 'x'.repeat(40000)
    expect((await call(big)).status).toBe(413)
  })

  it('429 at 50 saved plans, without inserting', async () => {
    const f = setup({ count: { data: null, error: null, count: 50 } })
    const r = await call(validBody())
    expect(r.status).toBe(429)
    expect(r.json.error).toBe('You have reached the saved plan limit')
    expect(f.calls.filter(c => c.op === 'insert')).toHaveLength(0)
  })

  it('49 saved plans still saves', async () => {
    setup({ count: { data: null, error: null, count: 49 } })
    expect((await call(validBody())).status).toBe(200)
  })

  it('maps the count failure, FK failure, other failures and a missing id to fixed messages without Postgres text', async () => {
    const cases: Array<[Parameters<typeof setup>[0], number, string]> = [
      [{ count: { data: null, error: { code: '42501', message: LEAK } } }, 500, 'Could not save your plan'],
      [{ count: { data: null, error: null, count: null } }, 500, 'Could not save your plan'],
      [{ insert: { data: null, error: { code: '23503', message: LEAK, details: LEAK } } }, 409, 'Your profile is not ready. Please sign out and back in.'],
      [{ insert: { data: null, error: { code: '42501', message: LEAK } } }, 500, 'Could not save your plan'],
      [{ insert: { data: null, error: null } }, 500, 'Could not save your plan'],
      [{ insert: { data: { id: 5 }, error: null } }, 500, 'Could not save your plan'],
    ]
    for (const [opts, status, message] of cases) {
      setup(opts)
      const r = await call(validBody())
      expect(r.status).toBe(status)
      expect(r.cache).toBe('no-store')
      expect(r.json).toEqual({ success: false, error: message })
      expect(r.text).not.toContain('PGSECRET')
    }
  })

  it('logs codes only, never Postgres text', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ insert: { data: null, error: { code: '42501', message: LEAK } } })
    await call(validBody())
    expect(JSON.stringify(spy.mock.calls)).not.toContain('PGSECRET')
  })

  it('500 with a fixed message when the client throws', async () => {
    h.createSupabaseAdmin.mockImplementation(() => { throw new Error(LEAK) })
    const r = await call(validBody())
    expect(r.status).toBe(500)
    expect(r.text).not.toContain('PGSECRET')
  })
})
