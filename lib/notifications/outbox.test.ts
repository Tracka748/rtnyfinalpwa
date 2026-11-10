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
const ACT = '22222222-2222-2222-2222-222222222222'
const STAFF_ROW = { id: 'n-staff', request_id: REQ, audience: 'staff', recipient_user_id: 'u-staff', kind: 'new_request', dedupe_key: 'new_request' }
const CUSTOMER_ROW = { id: 'n-cust', request_id: REQ, audience: 'customer', recipient_user_id: 'u-cust', kind: 'customer_confirmation', dedupe_key: 'confirmation' }
const ASSIGNED_ROW = { id: 'n-assigned', request_id: REQ, audience: 'staff', recipient_user_id: 'u-staff', kind: 'assigned', dedupe_key: `assigned:${ACT}` }
const ACT2 = '33333333-3333-3333-3333-333333333333'
const statusRow = (to: string, act = ACT) => ({
  id: `n-${to}`, request_id: REQ, audience: 'customer', recipient_user_id: 'u-cust', kind: 'status_update', dedupe_key: `status:${to}:${act}`,
})
const CONFIG = { apiKey: 'k', from: 'RTNY <noreply@example.com>' }
const CONFIRMED = { id: 'u', email: 'real@user.com', email_confirmed_at: '2026-01-01', confirmed_at: '2026-01-01' }
// The request row deliberately carries customer data: it must never reach a body or a mark call.
const REQUEST_ROW = {
  id: REQ, request_source: 'theme_package', request_kind: 'reserve',
  status: 'in_progress', user_id: 'u-cust', coordinator_id: 'u-staff',
  notes: 'SECRET-NOTE', event_type: 'EVIL <script>', contact_email: 'contact@customer.com',
}
const assignedActivity = (over = {}) => ({ id: ACT, request_id: REQ, action: 'assigned', to_status: 'in_progress', to_owner: 'u-staff', ...over })
const statusActivity = (to: string, over = {}) => ({ id: ACT, request_id: REQ, action: 'status_changed', to_status: to, to_owner: null, ...over })

interface Opts {
  rows?: unknown[]
  claim?: FakeResult
  requests?: unknown[]
  requestsError?: unknown
  activity?: unknown
  activityError?: unknown
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
    respond: (q: Recorded) => {
      if (q.table === 'plan_requests') return { data: o.requests ?? [REQUEST_ROW], error: o.requestsError ?? null }
      if (q.table === 'request_activity') {
        const data = typeof o.activity === 'function' ? (o.activity as (id: unknown) => unknown)(q.eq.id) : o.activity
        return { data: data ?? null, error: o.activityError ?? null }
      }
      return { data: null, error: null }
    },
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
    const f = setup({ rows: [{ ...STAFF_ROW, kind: 'unclaimed_reminder' }] })
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

describe('processNotificationOutbox: email configuration (checked before claiming)', () => {
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

  it('a bad NEXT_PUBLIC_APP_URL no longer stops the claim', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    const f = setup({ rows: [] })
    await run()
    expect(calls(f, 'request_notifications_claim_email')).toHaveLength(1)
  })
})

// Team emails contain an application link, so they need a valid https base URL. Customer emails never read it.
describe('processNotificationOutbox: application URL (per row, link emails only)', () => {
  const BAD_URLS = [
    '', '   ', 'app.example.com', 'http://app.example.com', 'http://localhost:3000', 'https://app.example.com/admin',
    'https://app.example.com?x=1', 'https://app.example.com/?', 'https://u:p@app.example.com',
    'https://app.example.com/#', 'https://app.example.com/#s', 'javascript:alert(1)', 'https://x.com/"><img src=x>',
  ]

  it.each(BAD_URLS)('team emails retry with app_url_not_configured when NEXT_PUBLIC_APP_URL is %j', async value => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', value)
    vi.clearAllMocks()
    const f = setup({ rows: [STAFF_ROW, ASSIGNED_ROW], activity: assignedActivity() })
    const s = await run()
    expect(s).toMatchObject({ claimed: 2, retried: 2, sent: 0 })
    expect(marks(f)).toEqual([
      { p_id: 'n-staff', p_outcome: 'retry', p_error_code: 'app_url_not_configured', p_provider_message_id: null },
      { p_id: 'n-assigned', p_outcome: 'retry', p_error_code: 'app_url_not_configured', p_provider_message_id: null },
    ])
    expect(h.sendEmail).not.toHaveBeenCalled()
    if (value.trim()) {
      expect(JSON.stringify([...marks(f), ...errSpy.mock.calls])).not.toContain(value)
    }
  })

  it('team emails retry when NEXT_PUBLIC_APP_URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined as never)
    const f = setup({ rows: [STAFF_ROW, ASSIGNED_ROW], activity: assignedActivity() })
    await run()
    expect(marks(f).map(m => m.p_error_code)).toEqual(['app_url_not_configured', 'app_url_not_configured'])
    expect(errSpy.mock.calls.filter((c: unknown[]) => String(c[0]).includes('NEXT_PUBLIC_APP_URL'))).toHaveLength(1)
  })

  it.each(['', 'http://localhost:3000', 'https://app.example.com/admin'])(
    'a customer status email is sent normally when NEXT_PUBLIC_APP_URL is %j',
    async value => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', value)
      const f = setup({ rows: [statusRow('date_confirmed')], activity: statusActivity('date_confirmed') })
      await run()
      expect(h.sendEmail).toHaveBeenCalledTimes(1)
      expect(marks(f)[0]).toMatchObject({ p_outcome: 'sent' })
    }
  )

  it('customer confirmation is also independent of the URL, and a valid URL is normalized into links', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined as never)
    setup({ rows: [CUSTOMER_ROW] })
    await run()
    expect(h.sendEmail).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com/')
    setup({ rows: [ASSIGNED_ROW], activity: assignedActivity() })
    await run()
    expect(h.sendEmail.mock.calls[0][0].text).toContain(`https://app.example.com/admin/requests/${REQ}`)
    expect(h.sendEmail.mock.calls[0][0].text).not.toContain('example.com//')
  })

  it('a bad URL does not hold back a customer email in the same batch', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    const f = setup({
      rows: [ASSIGNED_ROW, statusRow('date_confirmed', ACT2)],
      activity: (id: unknown) => (id === ACT ? assignedActivity() : statusActivity('date_confirmed', { id: ACT2 })),
    })
    const s = await run()
    expect(s).toMatchObject({ claimed: 2, retried: 1, sent: 1 })
    expect(marks(f)).toEqual([
      { p_id: 'n-assigned', p_outcome: 'retry', p_error_code: 'app_url_not_configured', p_provider_message_id: null },
      { p_id: 'n-date_confirmed', p_outcome: 'sent', p_error_code: null, p_provider_message_id: 're_1' },
    ])
  })
})

describe('processNotificationOutbox: assigned (team email to the new owner)', () => {
  it('sends the fixed-subject, link-only email to the new owner only', async () => {
    const f = setup({ rows: [ASSIGNED_ROW], activity: assignedActivity() })
    const s = await run()
    expect(s).toMatchObject({ claimed: 1, sent: 1 })
    expect(f.getUser).toHaveBeenCalledTimes(1)
    expect(f.getUser).toHaveBeenCalledWith('u-staff')
    expect(calls(f, 'specialist_can')).toEqual([{ p_user_id: 'u-staff', p_capability: 'events.requests.manage', p_required: 'allow' }])
    const msg = h.sendEmail.mock.calls[0][0]
    expect(msg).toMatchObject({ to: 'real@user.com', subject: 'A request was assigned to you' })
    expect(msg.text).toContain(`https://app.example.com/admin/requests/${REQ}`)
    expect(`${msg.subject}${msg.html}${msg.text}`).not.toMatch(/SECRET-NOTE|EVIL|contact@customer\.com|reason|Package/i)
    expect(marks(f)).toEqual([{ p_id: 'n-assigned', p_outcome: 'sent', p_error_code: null, p_provider_message_id: 're_1' }])
  })

  it('accepts a reassignment entry too', async () => {
    setup({ rows: [ASSIGNED_ROW], activity: assignedActivity({ action: 'reassigned' }) })
    await run()
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('skips with no_longer_owner (terminal) when the request has moved to someone else, with no send', async () => {
    const f = setup({
      rows: [ASSIGNED_ROW], activity: assignedActivity(),
      requests: [{ ...REQUEST_ROW, coordinator_id: 'u-someone-else' }],
    })
    await run()
    expect(marks(f)).toEqual([{ p_id: 'n-assigned', p_outcome: 'skipped', p_error_code: 'no_longer_owner', p_provider_message_id: null }])
    expect(f.getUser).not.toHaveBeenCalled()
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('skips with no_longer_owner when the request is unowned', async () => {
    const f = setup({ rows: [ASSIGNED_ROW], activity: assignedActivity(), requests: [{ ...REQUEST_ROW, coordinator_id: null }] })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'skipped', p_error_code: 'no_longer_owner' })
  })

  it('skips with no_verified_email (terminal) when the owner has no confirmed auth email', async () => {
    for (const user of [null, { ...CONFIRMED, email: null }, { ...CONFIRMED, email_confirmed_at: null }]) {
      vi.clearAllMocks()
      const f = setup({ rows: [ASSIGNED_ROW], activity: assignedActivity(), user: { data: { user }, error: null } })
      await run()
      expect(marks(f)).toEqual([{ p_id: 'n-assigned', p_outcome: 'skipped', p_error_code: 'no_verified_email', p_provider_message_id: null }])
      expect(h.sendEmail).not.toHaveBeenCalled()
    }
  })

  it('skips with not_eligible when the owner can no longer manage requests', async () => {
    const f = setup({ rows: [ASSIGNED_ROW], activity: assignedActivity(), can: { data: false, error: null } })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'skipped', p_error_code: 'not_eligible' })
  })

  it('marks invalid_notification when the activity entry does not match the row', async () => {
    for (const activity of [
      assignedActivity({ to_owner: 'u-other' }),
      assignedActivity({ request_id: '99999999-9999-9999-9999-999999999999' }),
      assignedActivity({ action: 'claimed' }),
      assignedActivity({ action: 'status_changed' }),
      null,
    ]) {
      vi.clearAllMocks()
      const f = setup({ rows: [ASSIGNED_ROW], activity })
      await run()
      expect(marks(f)).toEqual([{ p_id: 'n-assigned', p_outcome: 'failed', p_error_code: 'invalid_notification', p_provider_message_id: null }])
      expect(h.sendEmail).not.toHaveBeenCalled()
    }
  })

  it('marks invalid_notification for a malformed dedupe key or a customer audience', async () => {
    for (const row of [{ ...ASSIGNED_ROW, dedupe_key: 'assigned:not-a-uuid' }, { ...ASSIGNED_ROW, dedupe_key: 'new_request' }, { ...ASSIGNED_ROW, audience: 'customer' }]) {
      vi.clearAllMocks()
      const f = setup({ rows: [row], activity: assignedActivity() })
      await run()
      expect(marks(f)[0]).toMatchObject({ p_outcome: 'failed', p_error_code: 'invalid_notification' })
    }
  })

  it('retries with activity_lookup_failed when the activity read errors, without logging its text', async () => {
    const f = setup({ rows: [ASSIGNED_ROW], activityError: { code: 'XX000', message: 'secret detail' } })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'retry', p_error_code: 'activity_lookup_failed' })
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('secret detail')
  })
})

describe('processNotificationOutbox: status_update (customer email)', () => {
  const COPY = {
    date_confirmed: 'Your event date has been confirmed. Our team will be in touch with next steps.',
    deposit_requested: 'Your event request has moved to the deposit stage. Please look out for further instructions from our team.',
    declined: "Unfortunately, we're unable to move forward with your event request at this time. Thank you for considering RocTicketNy.",
    cancelled: 'Your event request has been cancelled. If you believe this was done in error, please contact our team at hello@rocticketny.com.',
  }

  it.each(Object.entries(COPY))('%s sends the exact copy, no link, to the account email, with no eligibility check', async (to, copy) => {
    const f = setup({
      rows: [statusRow(to)], activity: statusActivity(to),
      requests: [{ ...REQUEST_ROW, status: to }], // declined/cancelled must match the current status
    })
    await run()
    const msg = h.sendEmail.mock.calls[0][0]
    expect(msg.to).toBe('real@user.com')
    expect(msg.subject).toBe('An update on your event request')
    expect(msg.text).toBe(copy)
    expect(msg.html).not.toMatch(/href|https?:\/\//i)
    expect(calls(f, 'specialist_can')).toHaveLength(0)
    expect(f.getUser).toHaveBeenCalledWith('u-cust')
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'sent', p_error_code: null })
  })

  it('never sends to contact_email, even when the account has no confirmed email', async () => {
    for (const user of [null, { ...CONFIRMED, email: null }, { ...CONFIRMED, email_confirmed_at: null }]) {
      vi.clearAllMocks()
      const f = setup({
        rows: [statusRow('date_confirmed')], activity: statusActivity('date_confirmed'),
        user: { data: { user }, error: null },
      })
      await run()
      expect(h.sendEmail).not.toHaveBeenCalled()
      expect(marks(f)).toEqual([{ p_id: 'n-date_confirmed', p_outcome: 'skipped', p_error_code: 'no_verified_email', p_provider_message_id: null }])
    }
  })

  it('contact_email never reaches the recipient or the body', async () => {
    setup({ rows: [statusRow('date_confirmed')], activity: statusActivity('date_confirmed') })
    await run()
    const msg = h.sendEmail.mock.calls[0][0]
    expect(msg.to).not.toBe('contact@customer.com')
    expect(`${msg.subject}${msg.html}${msg.text}`).not.toMatch(/contact@customer\.com|SECRET-NOTE|EVIL/)
  })

  it.each(['declined', 'cancelled'])('%s is skipped as status_changed_since when the request status differs', async to => {
    const f = setup({ rows: [statusRow(to)], activity: statusActivity(to), requests: [{ ...REQUEST_ROW, status: 'in_progress' }] })
    await run()
    expect(marks(f)).toEqual([{ p_id: `n-${to}`, p_outcome: 'skipped', p_error_code: 'status_changed_since', p_provider_message_id: null }])
    expect(f.getUser).not.toHaveBeenCalled()
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it.each(['date_confirmed', 'deposit_requested'])('%s is sent as logged even if the request has moved on', async to => {
    setup({ rows: [statusRow(to)], activity: statusActivity(to), requests: [{ ...REQUEST_ROW, status: 'completed' }] })
    await run()
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    expect(h.sendEmail.mock.calls[0][0].text).toBe(COPY[to as keyof typeof COPY])
  })

  it('marks invalid_notification when the recipient is not the request user', async () => {
    const f = setup({
      rows: [statusRow('date_confirmed')], activity: statusActivity('date_confirmed'),
      requests: [{ ...REQUEST_ROW, user_id: 'u-somebody-else' }],
    })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'failed', p_error_code: 'invalid_notification' })
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('marks invalid_notification for a request with no linked user', async () => {
    const f = setup({ rows: [statusRow('date_confirmed')], activity: statusActivity('date_confirmed'), requests: [{ ...REQUEST_ROW, user_id: null }] })
    await run()
    expect(marks(f)[0]).toMatchObject({ p_outcome: 'failed', p_error_code: 'invalid_notification' })
  })

  it('marks invalid_notification when the activity entry does not match the row', async () => {
    for (const activity of [
      statusActivity('declined'), // logged status differs from the key
      statusActivity('date_confirmed', { action: 'reopened' }),
      statusActivity('date_confirmed', { action: 'assigned' }),
      statusActivity('date_confirmed', { request_id: '99999999-9999-9999-9999-999999999999' }),
      null,
    ]) {
      vi.clearAllMocks()
      const f = setup({ rows: [statusRow('date_confirmed')], activity })
      await run()
      expect(marks(f)).toEqual([{ p_id: 'n-date_confirmed', p_outcome: 'failed', p_error_code: 'invalid_notification', p_provider_message_id: null }])
      expect(h.sendEmail).not.toHaveBeenCalled()
    }
  })

  it('marks invalid_notification for a status with no customer copy, a malformed key, or a staff audience', async () => {
    for (const row of [
      statusRow('in_progress'), statusRow('completed'), statusRow('pending'),
      { ...statusRow('date_confirmed'), dedupe_key: 'status:date_confirmed:not-a-uuid' },
      { ...statusRow('date_confirmed'), dedupe_key: 'confirmation' },
      { ...statusRow('date_confirmed'), audience: 'staff' },
    ]) {
      vi.clearAllMocks()
      const f = setup({ rows: [row], activity: statusActivity('date_confirmed') })
      await run()
      expect(marks(f)[0]).toMatchObject({ p_outcome: 'failed', p_error_code: 'invalid_notification' })
      expect(h.sendEmail).not.toHaveBeenCalled()
    }
  })
})

describe('processNotificationOutbox: mark codes are fixed strings', () => {
  it('every mark for the lifecycle kinds uses a short code with no values', async () => {
    const f = setup({
      rows: [ASSIGNED_ROW, statusRow('declined', ACT2), statusRow('date_confirmed', ACT2)],
      activity: (id: unknown) => (id === ACT ? assignedActivity() : statusActivity('declined', { id: ACT2 })),
      requests: [{ ...REQUEST_ROW, status: 'in_progress' }],
    })
    await run()
    // sent, skipped (status_changed_since) and failed (invalid_notification: logged status differs from the key)
    expect(marks(f).map(m => m.p_outcome)).toEqual(['sent', 'skipped', 'failed'])
    for (const m of marks(f)) {
      if (m.p_error_code) expect(m.p_error_code).toMatch(/^[a-z0-9_]{1,48}$/)
      expect(JSON.stringify(m)).not.toMatch(/@|SECRET|EVIL|app\.example\.com|u-staff|u-cust/)
    }
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
