import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INBOX_STATUSES, inboxError, validateInboxListQuery } from './request-inbox-api'

const q = (s: string) => validateInboxListQuery(new URLSearchParams(s))

describe('validateInboxListQuery', () => {
  it('applies defaults', () => {
    expect(q('')).toEqual({ ok: true, value: { scope: 'all', status: null, limit: 25, offset: 0 } })
  })

  it('accepts every scope and every lifecycle status', () => {
    for (const scope of ['all', 'mine', 'unassigned']) {
      expect(q(`scope=${scope}`)).toMatchObject({ ok: true, value: { scope } })
    }
    expect(INBOX_STATUSES).toHaveLength(8)
    for (const status of INBOX_STATUSES) {
      expect(q(`status=${status}`)).toMatchObject({ ok: true, value: { status } })
    }
  })

  it('accepts limit 1..100 and offset >= 0', () => {
    expect(q('limit=1&offset=0')).toMatchObject({ ok: true, value: { limit: 1, offset: 0 } })
    expect(q('limit=100&offset=250')).toMatchObject({ ok: true, value: { limit: 100, offset: 250 } })
  })

  it.each([
    'scope=everyone', 'scope=ALL', 'status=in_review', 'status=booked',
    'limit=0', 'limit=101', 'limit=abc', 'limit=-1', 'limit=1.5',
    'offset=-1', 'offset=x', 'offset=1.5', 'offset=100001',
  ])('rejects %s', s => {
    expect(q(s).ok).toBe(false)
  })
})

describe('inboxError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('maps 42501 to 403 with a fixed message', async () => {
    const res = inboxError({ code: '42501', message: 'permission denied for table secret_things' }, 't')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'Forbidden' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('maps everything else to a generic 500 and logs only the code', async () => {
    const res = inboxError({ code: 'P0001', message: 'leaky detail from postgres' }, 't')
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('leaky')
    expect(console.error).toHaveBeenCalledWith('[request-inbox] t: code=P0001')
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain('leaky')
  })

  it('handles thrown errors and odd codes without leaking', async () => {
    expect((inboxError(new Error('boom secret'), 't')).status).toBe(500)
    expect(inboxError({ code: 'x y; drop', message: 'm' }, 't').status).toBe(500)
    expect(console.error).toHaveBeenLastCalledWith('[request-inbox] t: code=unknown')
  })
})
