import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  createSupabaseAdmin: vi.fn(),
  createClient: vi.fn(),
  scheduleOutbox: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/notifications/outbox', () => ({ scheduleOutbox: h.scheduleOutbox }))

import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import { POST } from './route'

const NEW_ID = '44444444-4444-4444-4444-444444444444'
const BODY = {
  event_type: 'Birthday', event_date: null, time_start: null, time_end: null, budget_range: null,
  guest_count: null, has_venue: null, selected_service_ids: [], estimated_total: null, needs: [],
  notes: null, contact_email: null,
}

function setup(insert: FakeResult = { data: { id: NEW_ID }, error: null }) {
  const f = fakeSupabase({ respond: () => insert })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  h.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
  return f
}

const send = (body: unknown) =>
  POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as unknown as NextRequest)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubEnv('RESEND_FROM_EMAIL', '') // the existing hello@ alert takes its skip path
})

describe('POST /plan/request notification scheduling', () => {
  it('schedules the outbox for the new request after saving it', async () => {
    setup()
    const res = await send(BODY)
    expect(res.status).toBe(201)
    expect(h.scheduleOutbox).toHaveBeenCalledTimes(1)
    expect(h.scheduleOutbox).toHaveBeenCalledWith(NEW_ID)
  })

  it('does not schedule when the insert fails', async () => {
    setup({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect((await send(BODY)).status).toBe(500)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('does not schedule when event_type is missing', async () => {
    setup()
    expect((await send({ ...BODY, event_type: '  ' })).status).toBe(400)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })
})

describe('POST /plan/request selected_vendor_ids', () => {
  const V = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const LEAK = 'PGSECRET vendors relation detail'

  // vendors lookup answers with `known` (the active rows); the insert answers with NEW_ID.
  function setupVendors(known: string[] | FakeResult = []) {
    const f = fakeSupabase({
      respond: q => q.table === 'vendors'
        ? (Array.isArray(known) ? { data: known.map(id => ({ id })), error: null } : known)
        : { data: { id: NEW_ID }, error: null },
    })
    h.createSupabaseAdmin.mockReturnValue(f.client)
    h.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    return f
  }
  const lookups = (f: ReturnType<typeof setupVendors>) => f.calls.filter(c => c.table === 'vendors')
  const inserts = (f: ReturnType<typeof setupVendors>) => f.calls.filter(c => c.table === 'plan_requests' && c.op === 'insert')
  const stored = (f: ReturnType<typeof setupVendors>) => (inserts(f)[0].payload as { selected_vendor_ids: unknown }).selected_vendor_ids

  it('no field: stores [] and never queries vendors', async () => {
    const f = setupVendors()
    expect((await send(BODY)).status).toBe(201)
    expect(lookups(f)).toHaveLength(0)
    expect(stored(f)).toEqual([])
  })

  it('valid ids: one lookup on vendors by id and active, unknown or inactive dropped, order kept', async () => {
    const f = setupVendors([V(1), V(3)])
    const res = await send({ ...BODY, selected_vendor_ids: [V(3), V(2), V(1), V(3)] })
    expect(res.status).toBe(201)
    expect(lookups(f)).toHaveLength(1)
    expect(lookups(f)[0].in).toEqual({ id: [V(3), V(2), V(1)] })
    expect(lookups(f)[0].eq).toEqual({ active: true })
    expect(stored(f)).toEqual([V(3), V(1)])
    expect(h.scheduleOutbox).toHaveBeenCalledWith(NEW_ID)
  })

  it('20 distinct ids are accepted', async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => V(i + 1))
    const f = setupVendors(twenty)
    expect((await send({ ...BODY, selected_vendor_ids: twenty })).status).toBe(201)
    expect(stored(f)).toEqual(twenty)
  })

  const rejected: Array<[string, unknown, string]> = [
    ['malformed id', [V(1), 'not-a-uuid'], 'Invalid vendor selection'],
    ['non-string id', [V(1), 7], 'Invalid vendor selection'],
    ['non-array', V(1), 'Invalid vendor selection'],
    ['object', { id: V(1) }, 'Invalid vendor selection'],
    ['over 200 elements', Array(201).fill(V(1)), 'Invalid vendor selection'],
    ['21 distinct ids', Array.from({ length: 21 }, (_, i) => V(i + 1)), 'Too many vendors selected (max 20)'],
  ]
  for (const [name, value, message] of rejected) {
    it(`${name}: 422 with "${message}", no lookup, no insert, no outbox`, async () => {
      const f = setupVendors([V(1)])
      const res = await send({ ...BODY, selected_vendor_ids: value })
      expect(res.status).toBe(422)
      expect(await res.json()).toEqual({ success: false, error: message })
      expect(lookups(f)).toHaveLength(0)
      expect(inserts(f)).toHaveLength(0)
      expect(h.scheduleOutbox).not.toHaveBeenCalled()
    })
  }

  it('lookup error: 500 with the fixed message, no insert, no outbox, no raw text', async () => {
    const f = setupVendors({ data: null, error: { code: 'XX000', message: LEAK } })
    const res = await send({ ...BODY, selected_vendor_ids: [V(1)] })
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ success: false, error: 'Failed to submit plan request' })
    expect(text).not.toContain('PGSECRET')
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain('PGSECRET')
    expect(inserts(f)).toHaveLength(0)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  const serviceRejected: Array<[string, unknown, string]> = [
    ['malformed service id', [V(1), 'not-a-uuid'], 'Invalid service selection'],
    ['non-string service id', [V(1), 7], 'Invalid service selection'],
    ['non-array services', V(1), 'Invalid service selection'],
    ['services object', { id: V(1) }, 'Invalid service selection'],
    ['over 200 service elements', Array(201).fill(V(1)), 'Invalid service selection'],
    ['31 distinct services', Array.from({ length: 31 }, (_, i) => V(i + 1)), 'Too many services selected (max 30)'],
  ]
  for (const [name, value, message] of serviceRejected) {
    it(`${name}: 422 with "${message}", no lookup, no insert, no outbox`, async () => {
      const f = setupVendors([V(1)])
      const res = await send({ ...BODY, selected_service_ids: value, selected_vendor_ids: [V(1)] })
      expect(res.status).toBe(422)
      expect(await res.json()).toEqual({ success: false, error: message })
      expect(lookups(f)).toHaveLength(0)
      expect(inserts(f)).toHaveLength(0)
      expect(h.scheduleOutbox).not.toHaveBeenCalled()
    })
  }

  it('missing or null services store []', async () => {
    for (const body of [(({ selected_service_ids: _s, ...rest }) => rest)(BODY), { ...BODY, selected_service_ids: null }]) {
      const f = setupVendors()
      expect((await send(body)).status).toBe(201)
      expect((inserts(f)[0].payload as { selected_service_ids: unknown }).selected_service_ids).toEqual([])
    }
  })

  it('30 distinct services are accepted, stored lowercased and deduplicated', async () => {
    const hex = 'abcdef00-0000-4000-8000-00000000abcd'
    const thirty = [hex, ...Array.from({ length: 29 }, (_, i) => V(i + 1))]
    const f = setupVendors([V(1)])
    const res = await send({ ...BODY, selected_service_ids: [hex.toUpperCase(), ...thirty.slice(1), hex], selected_vendor_ids: [V(1)] })
    expect(res.status).toBe(201)
    const payload = inserts(f)[0].payload as { selected_service_ids: unknown; selected_vendor_ids: unknown }
    expect(payload.selected_service_ids).toEqual(thirty)
    expect(payload.selected_vendor_ids).toEqual([V(1)])
  })

  it('client vendor names, types and prices are ignored: only ids are stored', async () => {
    const f = setupVendors([V(1)])
    await send({
      ...BODY,
      selected_vendor_ids: [V(1)],
      planItems: [{ vendorId: V(1), vendorName: 'FAKE NAME', vendorType: 'venue', basePrice: 1 }],
      selected_vendors: [{ id: V(1), name: 'FAKE NAME', price: 1 }],
    })
    const payload = inserts(f)[0].payload as Record<string, unknown>
    expect(payload.selected_vendor_ids).toEqual([V(1)])
    expect(JSON.stringify(payload)).not.toContain('FAKE NAME')
    expect(Object.keys(payload)).not.toContain('planItems')
    expect(Object.keys(payload)).not.toContain('selected_vendors')
  })
})
