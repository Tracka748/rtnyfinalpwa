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
