import { describe, expect, it, vi } from 'vitest'
import {
  GENERIC_MESSAGE, NETWORK_MESSAGE, callLifecycle, loadAssignableOwners, shouldCloseSheet,
} from './request-lifecycle-client'

const ID = '11111111-1111-1111-1111-111111111111'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fakeFetch = (res: Response | (() => Promise<Response>)) =>
  vi.fn(async () => (typeof res === 'function' ? res() : res)) as unknown as typeof fetch & ReturnType<typeof vi.fn>

describe('callLifecycle', () => {
  it('posts JSON to the route with no-store and reports success', async () => {
    const f = fakeFetch(json({ success: true, data: {} }))
    expect(await callLifecycle(ID, 'release', { reason: 'busy' }, f)).toEqual({ ok: true })
    expect(f).toHaveBeenCalledWith(`/api/v1/admin/requests/${ID}/release`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'busy' }),
    })
  })

  it('sends no body for a claim', async () => {
    const f = fakeFetch(json({ success: true }))
    await callLifecycle(ID, 'claim', undefined, f)
    expect(f).toHaveBeenCalledWith(`/api/v1/admin/requests/${ID}/claim`, { method: 'POST', cache: 'no-store' })
  })

  it('returns the status and the route\'s fixed message on failure', async () => {
    for (const [status, error] of [[409, 'This request already has an owner'], [422, 'The selected owner is not valid'], [403, 'Forbidden'], [404, 'Request not found']] as const) {
      const r = await callLifecycle(ID, 'status', { to: 'completed' }, fakeFetch(json({ success: false, error }, status)))
      expect(r).toEqual({ ok: false, status, message: error })
    }
  })

  it('replaces an unsafe, oversized or missing message with the generic one', async () => {
    for (const body of [{ error: 'x'.repeat(500) }, { error: { stack: 'boom' } }, { error: '' }, {}, null]) {
      const r = await callLifecycle(ID, 'notes', { note: 'x' }, fakeFetch(json(body, 500)))
      expect(r).toEqual({ ok: false, status: 500, message: GENERIC_MESSAGE })
    }
  })

  it('handles a non-JSON error response without exposing it', async () => {
    const r = await callLifecycle(ID, 'status', { to: 'completed' }, fakeFetch(new Response('<html>PGSECRET trace</html>', { status: 502 })))
    expect(r).toEqual({ ok: false, status: 502, message: GENERIC_MESSAGE })
    expect(JSON.stringify(r)).not.toContain('PGSECRET')
  })

  it('maps a network failure to a fixed message with status 0', async () => {
    const r = await callLifecycle(ID, 'claim', undefined, fakeFetch(() => Promise.reject(new TypeError('Failed to fetch secret.host'))))
    expect(r).toEqual({ ok: false, status: 0, message: NETWORK_MESSAGE })
    expect(JSON.stringify(r)).not.toContain('secret.host')
  })

  it('encodes the request id into the path', async () => {
    const f = fakeFetch(json({ success: true }))
    await callLifecycle('a/b?c', 'claim', undefined, f)
    expect((f.mock.calls[0] as unknown[])[0]).toBe('/api/v1/admin/requests/a%2Fb%3Fc/claim')
  })
})

describe('shouldCloseSheet', () => {
  it('closes only for 404 and 409; 422, network and other failures keep the sheet open', () => {
    expect(shouldCloseSheet(404)).toBe(true)
    expect(shouldCloseSheet(409)).toBe(true)
    for (const s of [0, 400, 401, 403, 422, 500]) expect(shouldCloseSheet(s)).toBe(false)
  })
})

describe('loadAssignableOwners', () => {
  it('keeps only id and name, with a fallback name, and drops malformed entries', async () => {
    const f = fakeFetch(json({
      success: true,
      data: {
        owners: [
          { id: 'u1', name: ' Ann ', email: 'a@x.com', role: 'admin', is_admin: true },
          { id: 'u2', name: '' },
          { id: 'u3' },
          { id: '', name: 'No id' },
          { name: 'No id either' },
          null,
          'junk',
        ],
      },
    }))
    const r = await loadAssignableOwners(f)
    expect(r).toEqual({
      ok: true,
      owners: [{ id: 'u1', name: 'Ann' }, { id: 'u2', name: 'Staff member' }, { id: 'u3', name: 'Staff member' }],
    })
    expect(JSON.stringify(r)).not.toMatch(/@|role|admin/)
    expect(f).toHaveBeenCalledWith('/api/v1/admin/requests/assignable-owners', { cache: 'no-store', signal: undefined })
  })

  it('passes the abort signal through', async () => {
    const f = fakeFetch(json({ success: true, data: { owners: [] } }))
    const ctrl = new AbortController()
    await loadAssignableOwners(f, ctrl.signal)
    expect((f.mock.calls[0] as unknown[])[1]).toMatchObject({ signal: ctrl.signal })
  })

  it('returns a fixed message for failures, a bad shape or a network error', async () => {
    expect(await loadAssignableOwners(fakeFetch(json({ success: false, error: 'Forbidden' }, 403)))).toEqual({ ok: false, message: 'Forbidden' })
    expect(await loadAssignableOwners(fakeFetch(json({ success: true, data: {} })))).toEqual({ ok: false, message: GENERIC_MESSAGE })
    expect(await loadAssignableOwners(fakeFetch(json({ success: false, error: 'x'.repeat(300) }, 500)))).toEqual({ ok: false, message: GENERIC_MESSAGE })
    expect(await loadAssignableOwners(fakeFetch(() => Promise.reject(new Error('PGSECRET'))))).toEqual({ ok: false, message: NETWORK_MESSAGE })
  })
})
