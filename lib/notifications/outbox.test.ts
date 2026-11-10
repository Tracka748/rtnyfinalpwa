import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  createSupabaseAdmin: vi.fn(),
  sendEmail: vi.fn(),
  getEmailConfig: vi.fn(),
  after: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))
vi.mock('@/lib/notifications/email', () => ({ sendEmail: h.sendEmail, getEmailConfig: h.getEmailConfig }))
vi.mock('next/server', async importOriginal => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: h.after,
}))

import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import { processNotificationOutbox, scheduleOutbox } from '@/lib/notifications/outbox'

const REQ = '11111111-1111-1111-1111-111111111111'
const STAFF_ROW = { id: 'n-staff', request_id: REQ, audience: 'staff', recipient_user_id: 'u-staff', kind: 'new_request' }
const CUSTOMER_ROW = { id: 'n-cust', request_id: REQ, audience: 'customer', recipient_user_id: 'u-cust', kind: 'customer_confirmation' }
const CONFIG = { apiKey: 'k', from: 'RTNY <noreply@example.com>' }
const CONFIRMED = { id: 'u', email: 'real@user.com', email_confirmed_at: '2026-01-01', confirmed_at: '2026-01-01' }
// The request row deliberately carries customer data: it must never reach a body or a mark call.
const REQUEST_ROW = {
  id: REQ, request_source: 'theme_package', request_kind: 'reserve',
  notes: 'SECRET-NOTE', event_type: 'EVIL <script>', contact_email: 'contact@customer.com',
}

interface Opts {
  rows?: unknown[]
  claim?: FakeResult
  requests?: unknown[]
  requestsError?: unknown
  can?: FakeResult
  user?: FakeResult
  markResult?: FakeResult
}

function setup(o: Opts = {}) {
  const getUser = vi.fn((): FakeResult => o.user ?? { data: { user: CONFIRMED }, error: null })
  const f = fakeSupabase({
    rpc: fn => {
      if (fn === 'request_notifications_claim_email') return o.claim ?? { data: o.rows ?? [STAFF_ROW], error: null }
      if (fn === 'specialist_can') return o.can ?? { data: true, error: null }
      return o.markResult ?? { data: true, error: null }
    },
    respond: (q: Recorded) =>
      q.table === 'plan_requests'
        ? { data: o.requests ?? [REQUEST_ROW], error: o.requestsError ?? null }
        : { data: null, error: null },
    user: getUser,
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return { ...f, getUser }
}

const calls = (f: ReturnType<typeof setup>, fn: string) => f.rpcCalls.filter(c => c.fn === fn).map(c => c.args)
const marks = (f: ReturnType<typeof setup>) => calls(f, 'request_notifications_mark_email')
const run = (opts = {}) => processNotificationOutbox({ pauseMs: 0, ...opts })

let errSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
  h.getEmailConfig.mockReturnValue(CONFIG)
  h.sendEmail.mockResolvedValue({ ok: true, id: 're_1' })
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('processNotificationOutbox: sending', () => {
  it('claims, sends to the auth email and marks sent (staff)', async () => {
    const f = setup()
    const s = await run({ requestId: REQ })
    expect(s).toEqual({ claimed: 1, sent: 1, retried: 0, failed: 0, skipped: 0 })
    expect(calls(f, 'request_notifications_claim_email')).toEqual([{ p_limit: 20, p_request_id: REQ }])
    expect(calls(f, 'specialist_can')).toEqual([{ p_user_id: 'u-staff', p_capability: 'events.requests.manage', p_required: 'allow' }])
    expect(f.getUser).toHaveBeenCalledWith('u-staff')
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    expect(h.sendEmail.mock.calls[0][0]).toMatchObject({ to: 'real@user.com', subject: 'New request: Package reservation request' })
    expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'sent', p_error_code: null, p_provider_message_id: 're_1' }])
  })

  it('sends the customer confirmation to the auth email, never contact_email, without an eligibility check', async () => {
    const f = setup({ rows: [CUSTOMER_ROW] })
    await run()
    expect(calls(f, 'specialist_can')).toHaveLength(0)
    expect(h.sendEmail.mock.calls[0][0].to).toBe('real@user.com')
    expect(h.sendEmail.mock.calls[0][0].subject).toBe('We received your request')
    expect(marks(f)[0]).toMatchObject({ p_id: 'n-cust', p_outcome: 'sent' })
  })

  it('does nothing for an empty claim', async () => {
    const f = setup({ rows: [] })
    expect(await run()).toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 })
    expect(marks(f)).toHaveLength(0)
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('returns a zero summary without throwing when the claim fails', async () => {
    const f = setup({ claim: { data: null, error: { code: 'XX000', message: 'secret detail' } } })
    expect(await run()).toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 })
    expect(marks(f)).toHaveLength(0)
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('secret detail')
  })
})

describe('processNotificationOutbox: outcomes', () => {
  it('marks retry with a short code on a 429', async () => {
    const f = setup()
    h.sendEmail.mockResolvedValue({ ok: false, code: 'provider_rate_limited', retryable: true })
    const s = await run()
    expect(s.retried).toBe(1)
    expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'retry', p_error_code: 'provider_rate_limited', p_provider_message_id: null }])
  })

  it('marks retry for a 401/403-style provider_auth error', async () => {
    const f = setup()
    h.sendEmail.mockResolvedValue({ ok: false, code: 'provider_auth', retryable: true })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'retry', p_error_code: 'provider_auth' })
  })

  it('marks failed on a permanent error', async () => {
    const f = setup()
    h.sendEmail.mockResolvedValue({ ok: false, code: 'invalid_recipient', retryable: false })
    const s = await run()
    expect(s.failed).toBe(1)
    expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'failed', p_error_code: 'invalid_recipient', p_provider_message_id: null }])
  })

  it('marks skipped when the recipient has no confirmed email (missing, unconfirmed, phone-only confirmation)', async () => {
    for (const user of [null, { ...CONFIRMED, email: null }, { ...CONFIRMED, email_confirmed_at: null }, { ...CONFIRMED, email_confirmed_at: null, confirmed_at: '2026-01-01' }]) {
      vi.clearAllMocks()
      const f = setup({ user: { data: { user }, error: null } })
      await run()
      expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'skipped', p_error_code: 'no_verified_email', p_provider_message_id: null }])
      expect(h.sendEmail).not.toHaveBeenCalled()
    }
  })

  it('marks retry when the auth lookup errors', async () => {
    const f = setup({ user: { data: null, error: { code: 'x', message: 'secret@x.com' } } })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'retry', p_error_code: 'recipient_lookup_failed' })
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('marks skipped for a kind it does not build yet', async () => {
    const f = setup({ rows: [{ ...STAFF_ROW, kind: 'status_update' }] })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'skipped', p_error_code: 'kind_not_supported' })
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('marks failed when the request row is missing, and retry when the request lookup errors', async () => {
    let f = setup({ requests: [] })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'failed', p_error_code: 'request_not_found' })

    vi.clearAllMocks()
    f = setup({ requestsError: { code: 'XX000', message: 'secret' } })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'retry', p_error_code: 'request_lookup_failed' })
  })
})

describe('processNotificationOutbox: staff eligibility at send time', () => {
  it('sends when the recipient is still eligible', async () => {
    const f = setup({ can: { data: true, error: null } })
    await run()
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'sent' })
  })

  it('marks skipped/not_eligible, with no address lookup and no send, when no longer eligible', async () => {
    const f = setup({ can: { data: false, error: null } })
    const s = await run()
    expect(s.skipped).toBe(1)
    expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'skipped', p_error_code: 'not_eligible', p_provider_message_id: null }])
    expect(f.getUser).not.toHaveBeenCalled()
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('marks retry/recipient_lookup_failed when the eligibility RPC errors', async () => {
    const f = setup({ can: { data: null, error: { code: 'XX000', message: 'secret detail' } } })
    const s = await run()
    expect(s.retried).toBe(1)
    expect(marks(f)).toEqual([{ p_id: 'n-staff', p_outcome: 'retry', p_error_code: 'recipient_lookup_failed', p_provider_message_id: null }])
    expect(h.sendEmail).not.toHaveBeenCalled()
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('secret detail')
  })

  it('treats anything other than true as not eligible', async () => {
    const f = setup({ can: { data: null, error: null } })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'skipped', p_error_code: 'not_eligible' })
  })
})

describe('processNotificationOutbox: configuration (checked before claiming)', () => {
  it('does not claim, send or mark when email is not configured, and logs one value-free line', async () => {
    h.getEmailConfig.mockReturnValue(null)
    const f = setup()
    expect(await run()).toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 })
    expect(f.rpcCalls).toHaveLength(0)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
    expect(h.sendEmail).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalledTimes(1)
    expect(String(errSpy.mock.calls[0][0])).not.toContain('app.example.com')
  })

  it.each([[''], ['app.example.com'], ['https://x.com/"><img src=x>']])('does not claim when NEXT_PUBLIC_APP_URL is %j', async value => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', value)
    const f = setup()
    expect(await run()).toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 })
    expect(f.rpcCalls).toHaveLength(0)
    expect(h.sendEmail).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalledTimes(1)
  })

  it('does not claim when NEXT_PUBLIC_APP_URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined as never)
    const f = setup()
    await run()
    expect(f.rpcCalls).toHaveLength(0)
  })
})

describe('processNotificationOutbox: privacy', () => {
  it('keeps customer data and raw error text out of email bodies, mark calls and logs', async () => {
    const f = setup({ rows: [STAFF_ROW, CUSTOMER_ROW] })
    h.sendEmail.mockRejectedValueOnce(new Error('boom secret@x.com')).mockResolvedValueOnce({ ok: true, id: 're_2' })
    await run()

    for (const args of marks(f)) {
      expect(JSON.stringify(args)).not.toMatch(/@|secret/i)
      if (args.p_error_code) expect(args.p_error_code).toMatch(/^[a-z0-9_]{1,48}$/)
    }
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'retry', p_error_code: 'unexpected_error' })
    expect(JSON.stringify(errSpy.mock.calls)).not.toMatch(/secret@x\.com|real@user\.com/)

    for (const [msg] of h.sendEmail.mock.calls) {
      const body = `${msg.subject}${msg.html}${msg.text}`
      expect(body).not.toMatch(/SECRET-NOTE|EVIL|<script|contact@customer\.com|real@user\.com/)
    }
  })

  it('records the provider id on success and nothing else from the provider', async () => {
    const f = setup()
    await run()
    expect(marks(f)[0]).toEqual({ p_id: 'n-staff', p_outcome: 'sent', p_error_code: null, p_provider_message_id: 're_1' })
  })

  it('logs a failed mark with the row id and a code only', async () => {
    const f = setup({ markResult: { data: false, error: null } })
    await expect(run()).resolves.toMatchObject({ sent: 1 })
    expect(errSpy.mock.calls[0]).toEqual(['[notifications] mark failed:', 'n-staff', 'not_updated'])
    expect(marks(f)).toHaveLength(1)
  })
})

describe('scheduleOutbox', () => {
  it('hands the work to after() without running it inline', () => {
    setup()
    scheduleOutbox(REQ)
    expect(h.after).toHaveBeenCalledTimes(1)
    expect(typeof h.after.mock.calls[0][0]).toBe('function')
  })

  it('runs the outbox for that request, capped at 50, when after() runs the task', async () => {
    const f = setup({ rows: [] })
    h.after.mockImplementation((task: () => Promise<void>) => task())
    scheduleOutbox(REQ)
    await vi.waitFor(() => expect(calls(f, 'request_notifications_claim_email')).toEqual([{ p_limit: 50, p_request_id: REQ }]))
  })

  it('falls back to a direct run and never throws when after() is unavailable', async () => {
    const f = setup({ rows: [] })
    h.after.mockImplementation(() => { throw new Error('outside a request scope') })
    expect(() => scheduleOutbox(REQ)).not.toThrow()
    await vi.waitFor(() => expect(calls(f, 'request_notifications_claim_email')).toHaveLength(1))
  })
})
