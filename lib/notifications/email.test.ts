import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: h.send }
  },
}))

import { classifyProviderError, getEmailConfig, sendEmail } from '@/lib/notifications/email'

const CONFIG = { apiKey: 'key', from: 'RTNY <noreply@example.com>' }
const MSG = { to: 'a@b.com', subject: 'S', html: '<p>h</p>', text: 't' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEmailConfig', () => {
  it('needs both the key and the from address (trimmed)', () => {
    expect(getEmailConfig({ RESEND_API_KEY: 'k', RESEND_FROM_EMAIL: ' x@y.com ' } as never)).toEqual({ apiKey: 'k', from: 'RTNY <x@y.com>' })
    expect(getEmailConfig({ RESEND_API_KEY: 'k' } as never)).toBeNull()
    expect(getEmailConfig({ RESEND_FROM_EMAIL: 'x@y.com' } as never)).toBeNull()
    expect(getEmailConfig({ RESEND_API_KEY: ' ', RESEND_FROM_EMAIL: 'x@y.com' } as never)).toBeNull()
  })
})

describe('sendEmail', () => {
  it('is not configured without a config and never calls the provider', async () => {
    expect(await sendEmail(MSG, null)).toEqual({ ok: false, code: 'email_not_configured', retryable: false })
    expect(h.send).not.toHaveBeenCalled()
  })

  it('returns the provider id, capped at 128 characters', async () => {
    h.send.mockResolvedValue({ data: { id: 'x'.repeat(200) }, error: null })
    const r = await sendEmail(MSG, CONFIG)
    expect(r.ok && r.id).toHaveLength(128)
    expect(h.send).toHaveBeenCalledWith({ from: CONFIG.from, to: 'a@b.com', subject: 'S', html: '<p>h</p>', text: 't' })
  })

  it.each([
    [429, undefined, 'provider_rate_limited', true],
    [500, undefined, 'provider_unavailable', true],
    [503, undefined, 'provider_unavailable', true],
    [null, undefined, 'network_error', true],
    [401, undefined, 'provider_auth', true],
    [403, undefined, 'provider_auth', true],
    [422, 'invalid_to_address', 'invalid_recipient', false],
    [422, 'validation_error', 'provider_rejected', false],
    [400, undefined, 'provider_rejected', false],
  ])('maps status %s (%s) to %s, retryable=%s', async (statusCode, name, code, retryable) => {
    h.send.mockResolvedValue({ data: null, error: { statusCode, name, message: 'RAW secret@x.com text' } })
    const r = await sendEmail(MSG, CONFIG)
    expect(r).toEqual({ ok: false, code, retryable })
    expect(JSON.stringify(r)).not.toContain('RAW')
    expect(code).toMatch(/^[a-z0-9_]{1,48}$/)
  })

  it('turns a thrown error into a retryable network_error without its text', async () => {
    h.send.mockRejectedValue(new Error('boom secret@x.com'))
    const r = await sendEmail(MSG, CONFIG)
    expect(r).toEqual({ ok: false, code: 'network_error', retryable: true })
  })

  it('classifies directly too', () => {
    expect(classifyProviderError(404)).toEqual({ code: 'provider_rejected', retryable: false })
  })
})
