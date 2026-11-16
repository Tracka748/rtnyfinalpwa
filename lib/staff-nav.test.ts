import { describe, expect, it } from 'vitest'
import { lookupCanView, parseStaffAccessBody, staffNavLinks, STAFF_ACCESS_URL } from '@/lib/staff-nav'

describe('staffNavLinks', () => {
  it('signed out shows neither link, whatever else is claimed', () => {
    expect(staffNavLinks({ signedIn: false, isAdmin: true, canViewRequests: true })).toEqual({ showAdmin: false, showRequests: false })
  })

  it('an ordinary customer sees neither link', () => {
    expect(staffNavLinks({ signedIn: true, isAdmin: false, canViewRequests: false })).toEqual({ showAdmin: false, showRequests: false })
  })

  it('an admin sees both links', () => {
    expect(staffNavLinks({ signedIn: true, isAdmin: true, canViewRequests: true })).toEqual({ showAdmin: true, showRequests: true })
  })

  it('a specialist sees only Requests', () => {
    expect(staffNavLinks({ signedIn: true, isAdmin: false, canViewRequests: true })).toEqual({ showAdmin: false, showRequests: true })
  })

  it('the Admin link does not depend on the Requests answer, and vice versa', () => {
    expect(staffNavLinks({ signedIn: true, isAdmin: true, canViewRequests: false })).toEqual({ showAdmin: true, showRequests: false })
  })

  it('only an exact true shows Requests; only an exact true is admin', () => {
    for (const v of ['true', 1, {}, [], null, undefined, 'yes']) {
      expect(staffNavLinks({ signedIn: true, isAdmin: false, canViewRequests: v }).showRequests, String(v)).toBe(false)
      expect(staffNavLinks({ signedIn: true, isAdmin: v as boolean, canViewRequests: false }).showAdmin, String(v)).toBe(false)
    }
  })
})

describe('parseStaffAccessBody', () => {
  it('reads data.can_view only when it is exactly true', () => {
    expect(parseStaffAccessBody({ success: true, data: { can_view: true } })).toBe(true)
    expect(parseStaffAccessBody({ success: true, data: { can_view: false } })).toBe(false)
  })

  it('anything malformed is false', () => {
    for (const body of [null, undefined, 'x', 5, [], {}, { data: null }, { data: 'x' }, { data: {} }, { can_view: true },
      { data: { can_view: 'true' } }, { data: { can_view: 1 } }]) {
      expect(parseStaffAccessBody(body), JSON.stringify(body)).toBe(false)
    }
  })
})

describe('lookupCanView', () => {
  const ok = (body: unknown) => async () => ({ ok: true, json: async () => body })

  it('asks the staff-access route without caching', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    await lookupCanView(async (url, init) => { seen.push({ url, init }); return { ok: true, json: async () => ({}) } })
    expect(seen[0].url).toBe(STAFF_ACCESS_URL)
    expect(seen[0].url).toBe('/api/v1/users/me/staff-access')
    expect(seen[0].init?.cache).toBe('no-store')
  })

  it('true only for a well-formed true answer', async () => {
    expect(await lookupCanView(ok({ success: true, data: { can_view: true } }))).toBe(true)
    expect(await lookupCanView(ok({ success: true, data: { can_view: false } }))).toBe(false)
  })

  it('a missing or malformed body is false', async () => {
    for (const body of [null, undefined, {}, { success: true }, { success: true, data: null }, { success: true, data: { can_view: 'true' } }]) {
      expect(await lookupCanView(ok(body)), JSON.stringify(body)).toBe(false)
    }
  })

  it('a non-OK status is false, even with a true body', async () => {
    expect(await lookupCanView(async () => ({ ok: false, json: async () => ({ data: { can_view: true } }) }))).toBe(false)
  })

  it('non-JSON is false', async () => {
    expect(await lookupCanView(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <') } }))).toBe(false)
  })

  it('a network failure is false and never throws', async () => {
    expect(await lookupCanView(async () => { throw new TypeError('Load failed') })).toBe(false)
    expect(await lookupCanView(async () => undefined as never)).toBe(false)
  })
})
