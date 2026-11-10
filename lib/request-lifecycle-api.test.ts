import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ scheduleOutbox: vi.fn(), createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/notifications/outbox', () => ({ scheduleOutbox: h.scheduleOutbox }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import {
  NOTE_MAX, REASON_MAX, STATUS_TARGETS, lifecycleError, parseStatusTarget, parseText, parseUuid,
  projectResult, readStrictBody, requireAdminActor, scheduleOutboxSafe,
} from './request-lifecycle-api'

const ID = '11111111-1111-1111-1111-111111111111'
const LEAK = 'PGSECRET detail from postgres'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

describe('lifecycleError', () => {
  it.each([
    ['RQ409', 'request is closed', 409, 'This request is closed'],
    ['RQ409', 'request already has an owner', 409, 'This request already has an owner'],
    ['RQ409', 'request has no owner', 409, 'This request has no owner'],
    ['RQ409', 'request must be claimed first', 409, 'This request must be claimed first'],
    ['RQ422', 'new owner is not valid', 422, 'The selected owner is not valid'],
    ['RQ422', 'assignee cannot manage requests', 422, 'The selected person cannot manage requests'],
  ])('maps the known message %s "%s" to a fixed client text', async (code, message, status, text) => {
    const res = lifecycleError({ code, message }, 'claim', ID)
    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ success: false, error: text })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(console.error).toHaveBeenCalledWith(`[request-lifecycle] claim: code=${code} id=${ID}`)
    expect(logged()).not.toContain(message)
  })

  it.each([
    ['RQ404', 'whatever', 404, 'Request not found'],
    ['RQ409', LEAK, 409, "This request can't be changed that way right now"],
    ['RQ422', LEAK, 422, 'Invalid request'],
    ['42501', LEAK, 403, 'Forbidden'],
    ['RQ409', 'REQUEST IS CLOSED', 409, "This request can't be changed that way right now"], // exact match only
    ['RQ422', 'request is closed', 422, 'Invalid request'], // message is only valid for its own code
  ])('falls back to the fixed text for %s with an unlisted message', async (code, message, status, text) => {
    const res = lifecycleError({ code, message }, 'x')
    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ success: false, error: text })
  })

  it.each([
    [{ code: 'XX000', message: LEAK }], [{ code: '23514', message: LEAK }], [{ code: '40P01', message: LEAK }],
    [{ code: 'PGRST202', message: LEAK }], [{ message: LEAK }], [new Error(LEAK)], [null], [undefined],
  ])('maps an unmapped error to a generic 500 without leaking text', async err => {
    const res = lifecycleError(err, 'x', ID)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
    expect(logged()).not.toContain('PGSECRET')
  })

  it('logs a code that is not a short token as unknown, and ignores a bad request id', () => {
    lifecycleError({ code: 'x y; drop', message: LEAK }, 'x', 'not-a-uuid')
    expect(console.error).toHaveBeenCalledWith('[request-lifecycle] x: code=unknown')
  })
})

describe('parseText', () => {
  it('trims, and counts code points against the limit', () => {
    expect(parseText('f', '  hi  ', { required: true, max: 5 })).toEqual({ ok: true, value: 'hi' })
    expect(parseText('f', '😀'.repeat(5), { required: true, max: 5 }).ok).toBe(true) // 5 characters, 10 UTF-16 units
    expect(parseText('f', '😀'.repeat(6), { required: true, max: 5 }).ok).toBe(false)
  })
  it('enforces the shared limits', () => {
    expect(REASON_MAX).toBe(500)
    expect(NOTE_MAX).toBe(2000)
    expect(parseText('f', 'a'.repeat(500), { required: true, max: REASON_MAX }).ok).toBe(true)
    expect(parseText('f', 'a'.repeat(501), { required: true, max: REASON_MAX }).ok).toBe(false)
    expect(parseText('f', 'a'.repeat(2000), { required: true, max: NOTE_MAX }).ok).toBe(true)
    expect(parseText('f', 'a'.repeat(2001), { required: true, max: NOTE_MAX }).ok).toBe(false)
  })
  it('treats blank optional text as absent and rejects blank required text', () => {
    for (const v of [undefined, null, '', '  \t\n ']) {
      expect(parseText('f', v, { required: false, max: 5 })).toEqual({ ok: true, value: null })
      expect(parseText('f', v, { required: true, max: 5 }).ok).toBe(false)
    }
  })
  it('rejects non-strings', () => {
    for (const v of [5, true, {}, [], ['a']]) expect(parseText('f', v, { required: false, max: 5 }).ok).toBe(false)
  })
})

describe('parseUuid / parseStatusTarget', () => {
  it('validates uuids', () => {
    expect(parseUuid('x', ID)).toEqual({ ok: true, value: ID })
    for (const v of ['nope', '', 5, null, undefined, `${ID}x`]) expect(parseUuid('x', v).ok).toBe(false)
  })
  it('allows the seven targets and rejects pending and unknown values', () => {
    expect(STATUS_TARGETS).toHaveLength(7)
    for (const s of STATUS_TARGETS) expect(parseStatusTarget(s)).toEqual({ ok: true, value: s })
    for (const v of ['pending', 'booked', 'in_review', '', null, 5, 'constructor']) expect(parseStatusTarget(v).ok).toBe(false)
  })
})

describe('readStrictBody', () => {
  const req = (body?: string) => new Request('http://localhost/x', { method: 'POST', body })
  it('accepts an empty body as {}', async () => {
    expect(await readStrictBody(req(), [])).toEqual({ ok: true, body: {} })
    expect(await readStrictBody(req(''), ['a'])).toEqual({ ok: true, body: {} })
  })
  it('accepts allowed keys only', async () => {
    expect(await readStrictBody(req('{"a":1}'), ['a'])).toEqual({ ok: true, body: { a: 1 } })
    for (const body of ['{"a":1,"actor":"x"}', '{"p_actor":"x"}']) {
      const r = await readStrictBody(req(body), ['a'])
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.response.status).toBe(400)
    }
  })
  it('rejects invalid JSON and non-objects', async () => {
    for (const body of ['not json', '[]', '"x"', '5', 'null']) {
      const r = await readStrictBody(req(body), ['a'])
      expect(r.ok).toBe(false)
    }
  })
})

describe('projectResult', () => {
  it('returns only the allowlisted fields', () => {
    expect(projectResult({
      status: 'in_progress', owner_id: 'u', activity_id: 'a', action: 'released',
      reason: 'SECRET', note: 'SECRET', email: 'a@b.com', contact: { x: 1 },
    })).toEqual({ status: 'in_progress', owner_id: 'u', activity_id: 'a', action: 'released' })
  })
  it('keeps a null owner and survives bad input', () => {
    expect(projectResult({ status: 'pending', owner_id: null })).toEqual({ status: 'pending', owner_id: null })
    for (const v of [null, undefined, 5, 'x', []]) expect(projectResult(v)).toEqual({})
    expect(projectResult({ status: 5, owner_id: 5, activity_id: {} })).toEqual({})
  })
})

describe('requireAdminActor', () => {
  const admin = (r: unknown) => h.createSupabaseAdmin.mockReturnValue({ rpc: async () => r })
  it('allows an admin, denies everyone else and fails closed', async () => {
    admin({ data: true, error: null })
    expect(await requireAdminActor('u')).toBeNull()
    for (const r of [{ data: false, error: null }, { data: null, error: null }, { data: 'true', error: null }, { data: null, error: { code: 'XX000', message: LEAK } }]) {
      admin(r)
      expect((await requireAdminActor('u'))?.status).toBe(403)
    }
    h.createSupabaseAdmin.mockImplementation(() => { throw new Error(LEAK) })
    expect((await requireAdminActor('u'))?.status).toBe(403)
    expect(logged()).not.toContain('PGSECRET')
  })
})

describe('scheduleOutboxSafe', () => {
  it('schedules the request, and never throws', () => {
    scheduleOutboxSafe(ID)
    expect(h.scheduleOutbox).toHaveBeenCalledWith(ID)
    h.scheduleOutbox.mockImplementation(() => { throw new Error(LEAK) })
    expect(() => scheduleOutboxSafe(ID)).not.toThrow()
    expect(logged()).not.toContain('PGSECRET')
  })
})
