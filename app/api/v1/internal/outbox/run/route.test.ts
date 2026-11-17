import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('@/lib/notifications/outbox', () => ({ runOutboxWithBudget: h.run }))

import { GET, POST, dynamic, maxDuration, runtime } from './route'

const SECRET = 'c'.repeat(48)
const COUNTS = { claimed: 3, sent: 2, retried: 1, failed: 0, skipped: 0, batches: 1, deferred: 0 }

const req = (method: 'GET' | 'POST', auth?: string, body?: string) =>
  new Request('https://app.example.com/api/v1/internal/outbox/run', {
    method,
    headers: auth === undefined ? {} : { authorization: auth },
    body: method === 'POST' ? body ?? '{}' : undefined,
  }) as unknown as NextRequest

let errSpy: ReturnType<typeof vi.spyOn>
let logSpy: ReturnType<typeof vi.spyOn>
const allLogs = () => JSON.stringify([...errSpy.mock.calls, ...logSpy.mock.calls])

beforeEach(() => {
  vi.clearAllMocks()
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubEnv('CRON_SECRET', SECRET)
  h.run.mockResolvedValue({ ...COUNTS, extra: 'never-returned' })
})
afterEach(() => vi.unstubAllEnvs())

describe('POST/GET /api/v1/internal/outbox/run', () => {
  it('is a dynamic Node route with a 60-second limit', () => {
    expect(runtime).toBe('nodejs')
    expect(dynamic).toBe('force-dynamic')
    expect(maxDuration).toBe(60)
  })

  it('fails closed with 503 when CRON_SECRET is missing or too short, and never runs', async () => {
    for (const v of ['', 'short']) {
      vi.stubEnv('CRON_SECRET', v)
      for (const res of [await GET(req('GET', `Bearer ${v}`)), await POST(req('POST', `Bearer ${v}`))]) {
        expect(res.status).toBe(503)
        expect(await res.json()).toEqual({ success: false, error: 'Not configured' })
        expect(res.headers.get('Cache-Control')).toBe('no-store')
      }
    }
    expect(h.run).not.toHaveBeenCalled()
  })

  it('401 for a missing, wrong or malformed bearer, and never runs', async () => {
    for (const auth of [undefined, '', `Bearer ${'x'.repeat(48)}`, `Basic ${SECRET}`, SECRET, `Bearer ${SECRET}x`]) {
      for (const res of [await GET(req('GET', auth)), await POST(req('POST', auth))]) {
        expect(res.status, String(auth)).toBe(401)
        expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' })
      }
    }
    expect(h.run).not.toHaveBeenCalled()
  })

  it('GET (Vercel Cron) and POST (pg_net) both run the budgeted worker and return counts only, no-store', async () => {
    for (const res of [await GET(req('GET', `Bearer ${SECRET}`)), await POST(req('POST', `Bearer ${SECRET}`))]) {
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(await res.json()).toEqual({ success: true, data: COUNTS })
    }
    expect(h.run).toHaveBeenCalledTimes(2)
    expect(h.run).toHaveBeenCalledWith()
  })

  it('a worker throw returns a fixed 500', async () => {
    h.run.mockRejectedValue(new Error('PGSECRET boom'))
    const res = await POST(req('POST', `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ success: false, error: 'Outbox run failed' })
    expect(text + allLogs()).not.toContain('PGSECRET')
  })

  it('never logs or returns the secret, the Authorization header or the body', async () => {
    const body = '{"note":"BODY-SECRET"}'
    const outs = [
      await POST(req('POST', `Bearer ${SECRET}`, body)),
      await POST(req('POST', `Bearer wrong-${SECRET}`, body)),
    ]
    h.run.mockRejectedValue(new Error('x'))
    outs.push(await POST(req('POST', `Bearer ${SECRET}`, body)))
    vi.stubEnv('CRON_SECRET', '')
    outs.push(await POST(req('POST', `Bearer ${SECRET}`, body)))
    const texts = await Promise.all(outs.map(r => r.text()))
    const all = texts.join('') + allLogs()
    expect(all).not.toContain(SECRET)
    expect(all).not.toContain('Bearer')
    expect(all).not.toContain('BODY-SECRET')
  })
})
