import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  createSupabaseAdmin: vi.fn(),
  scheduleOutbox: vi.fn(),
}))

vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireCapability: h.requireCapability }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))
vi.mock('@/lib/notifications/outbox', () => ({ scheduleOutbox: h.scheduleOutbox }))

import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import * as claimRoute from './[id]/claim/route'
import * as releaseRoute from './[id]/release/route'
import * as reassignRoute from './[id]/reassign/route'
import * as statusRoute from './[id]/status/route'
import * as notesRoute from './[id]/notes/route'
import * as ownersRoute from './assignable-owners/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ASSIGNEE = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const REQ = '11111111-1111-1111-1111-111111111111'
const LEAK = 'PGSECRET detail from postgres'
const RESULT = { status: 'in_progress', owner_id: SESSION, activity_id: '22222222-2222-2222-2222-222222222222' }

type Ctx = { params: Promise<{ id: string }> }
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>

interface Opts {
  admin?: FakeResult
  lifecycle?: FakeResult
  owner?: FakeResult
  eligible?: FakeResult
  profiles?: FakeResult
}

function setup(o: Opts = {}) {
  const f = fakeSupabase({
    rpc: fn => {
      if (fn === 'tp_is_admin') return o.admin ?? { data: true, error: null }
      if (fn === 'request_eligible_coordinators') return o.eligible ?? { data: [], error: null }
      return o.lifecycle ?? { data: RESULT, error: null }
    },
    respond: q => {
      if (q.table === 'plan_requests') return o.owner ?? { data: { coordinator_id: null }, error: null }
      if (q.table === 'profiles') return o.profiles ?? { data: [], error: null }
      return { data: null, error: null }
    },
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const lifecycleCalls = (f: ReturnType<typeof setup>) => f.rpcCalls.filter(c => c.fn.startsWith('request_') && c.fn !== 'request_eligible_coordinators')
const allow = () => h.requireCapability.mockResolvedValue({ error: false, response: null, userId: SESSION })
const deny = (status: number, error: string) =>
  h.requireCapability.mockResolvedValue({
    error: true, userId: null,
    response: new Response(JSON.stringify({ success: false, error }), { status, headers: { 'content-type': 'application/json' } }),
  })

const post = (handler: Handler, body: unknown, id = REQ, qs = '') =>
  handler(
    new Request(`http://localhost/api/v1/admin/requests/${id}/x${qs}`, {
      method: 'POST',
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    }) as unknown as NextRequest,
    { params: Promise.resolve({ id }) }
  )
const getOwners = () => ownersRoute.GET(new Request('http://localhost/api/v1/admin/requests/assignable-owners') as unknown as NextRequest)

const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  allow()
})

// ---- shared behavior of the five POST routes ----

const routes: Array<{ name: string; handler: Handler; rpc: string; body: unknown; schedules: boolean; adminOnly: boolean }> = [
  { name: 'claim', handler: claimRoute.POST as Handler, rpc: 'request_claim', body: {}, schedules: false, adminOnly: false },
  { name: 'release', handler: releaseRoute.POST as Handler, rpc: 'request_release', body: { reason: 'handing back' }, schedules: false, adminOnly: false },
  { name: 'reassign', handler: reassignRoute.POST as Handler, rpc: 'request_assign', body: { assignee_id: ASSIGNEE }, schedules: true, adminOnly: true },
  { name: 'status', handler: statusRoute.POST as Handler, rpc: 'request_set_status', body: { to: 'date_confirmed' }, schedules: true, adminOnly: false },
  { name: 'notes', handler: notesRoute.POST as Handler, rpc: 'request_add_note', body: { note: 'called the customer' }, schedules: false, adminOnly: false },
]

describe.each(routes)('POST $name: guard, input and actor', ({ handler, rpc, body, adminOnly }) => {
  it('checks events.requests.manage (allow) first and never reaches the database when denied', async () => {
    for (const [status, msg] of [[401, 'Not authenticated'], [403, 'Forbidden']] as const) {
      deny(status, msg)
      const f = setup()
      const res = await post(handler, 'this is not json', 'nope') // bad id and bad body must not be reached first
      expect(res.status).toBe(status)
      expect(f.rpcCalls).toHaveLength(0)
      expect(f.calls).toHaveLength(0)
      expect(h.scheduleOutbox).not.toHaveBeenCalled()
    }
    allow()
    setup()
    await post(handler, body)
    expect(h.requireCapability).toHaveBeenLastCalledWith(expect.anything(), 'events.requests.manage', 'allow')
  })

  it('uses the session user as p_actor, ignoring any actor in the query', async () => {
    const f = setup()
    await post(handler, body, REQ, `?user_id=${OTHER}&actor=${OTHER}&p_actor=${OTHER}`)
    const call = lifecycleCalls(f)[0]
    expect(call.fn).toBe(rpc)
    expect(call.args.p_actor).toBe(SESSION)
    expect(JSON.stringify(call.args)).not.toContain(OTHER)
  })

  it('rejects an actor, owner or mode field in the body as an unknown field', async () => {
    for (const extra of [{ actor: OTHER }, { p_actor: OTHER }, { user_id: OTHER }, { owner_id: OTHER }, { mode: 'assign' }]) {
      const f = setup()
      const res = await post(handler, { ...(body as object), ...extra })
      expect(res.status).toBe(400)
      expect(lifecycleCalls(f)).toHaveLength(0)
      expect(h.scheduleOutbox).not.toHaveBeenCalled()
    }
  })

  it('400 for a bad id or invalid JSON, with no lifecycle RPC', async () => {
    const f = setup()
    expect((await post(handler, body, 'not-a-uuid')).status).toBe(400)
    if ((body as object) && Object.keys(body as object).length > 0) {
      expect((await post(handler, '{broken')).status).toBe(400)
      expect((await post(handler, '[]')).status).toBe(400)
    }
    expect(lifecycleCalls(f)).toHaveLength(0)
  })

  it.each([
    ['RQ409', 'request is closed', 409, 'This request is closed'],
    ['RQ409', 'request already has an owner', 409, 'This request already has an owner'],
    ['RQ409', 'request has no owner', 409, 'This request has no owner'],
    ['RQ409', 'request must be claimed first', 409, 'This request must be claimed first'],
    ['RQ422', 'new owner is not valid', 422, 'The selected owner is not valid'],
    ['RQ422', 'assignee cannot manage requests', 422, 'The selected person cannot manage requests'],
    ['RQ409', LEAK, 409, "This request can't be changed that way right now"],
    ['RQ422', LEAK, 422, 'Invalid request'],
    ['RQ404', LEAK, 404, 'Request not found'],
    ['42501', LEAK, 403, 'Forbidden'],
    ['XX000', LEAK, 500, 'Something went wrong'],
    ['PGRST202', LEAK, 500, 'Something went wrong'],
  ])('maps %s "%s" to %i with a fixed message, and never schedules the outbox', async (code, message, status, text) => {
    setup({ lifecycle: { data: null, error: { code, message } } })
    const res = await post(handler, body)
    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ success: false, error: text })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(logged()).not.toContain('PGSECRET')
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('maps a thrown error to a generic 500 without leaking text', async () => {
    h.createSupabaseAdmin.mockImplementation(() => { throw new Error(LEAK) })
    // an admin-only route fails its admin check closed (403) before any work; the others hit the catch
    const res = await post(handler, body)
    expect(res.status).toBe(adminOnly ? 403 : 500)
    expect(JSON.stringify(await res.json())).not.toContain('PGSECRET')
    expect(logged()).not.toContain('PGSECRET')
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('returns only the allowlisted fields, uncached, even when the RPC returns more', async () => {
    setup({ lifecycle: { data: { ...RESULT, action: 'x', email: 'a@b.com', note: 'SECRET', reason: 'SECRET', contact: { phone: '1' } }, error: null } })
    const res = await post(handler, body)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Object.keys(json.data).sort()).toEqual(['action', 'activity_id', 'owner_id', 'status'])
    expect(JSON.stringify(json)).not.toMatch(/a@b\.com|SECRET|phone/)
  })

  it('schedules the outbox only for assign/reassign/status, once, with the request id', async () => {
    setup()
    expect((await post(handler, body)).status).toBe(200)
    const expected = routes.find(r => r.handler === handler)!.schedules
    expect(h.scheduleOutbox).toHaveBeenCalledTimes(expected ? 1 : 0)
    if (expected) expect(h.scheduleOutbox).toHaveBeenCalledWith(REQ)
  })

  it('still succeeds when scheduling the outbox throws', async () => {
    h.scheduleOutbox.mockImplementation(() => { throw new Error(LEAK) })
    setup()
    expect((await post(handler, body)).status).toBe(200)
    expect(logged()).not.toContain('PGSECRET')
  })
})

// ---- claim ----

describe('POST claim', () => {
  it('accepts no body fields and calls request_claim', async () => {
    const f = setup()
    expect((await post(claimRoute.POST as Handler, undefined)).status).toBe(200)
    expect((await post(claimRoute.POST as Handler, {})).status).toBe(200)
    expect((await post(claimRoute.POST as Handler, { reason: 'x' })).status).toBe(400)
    expect(lifecycleCalls(f).map(c => c.args)).toEqual([{ p_actor: SESSION, p_request_id: REQ }, { p_actor: SESSION, p_request_id: REQ }])
  })
})

// ---- release ----

describe('POST release', () => {
  const release = (body: unknown) => post(releaseRoute.POST as Handler, body)
  it('requires a trimmed, non-empty reason of at most 500 characters', async () => {
    const f = setup()
    for (const body of [{}, { reason: '' }, { reason: '   \n\t ' }, { reason: 5 }, { reason: 'a'.repeat(501) }, { reason: null }]) {
      expect((await release(body)).status).toBe(400)
    }
    expect(lifecycleCalls(f)).toHaveLength(0)
    expect((await release({ reason: `  ${'a'.repeat(500)}  ` })).status).toBe(200)
    expect(lifecycleCalls(f)[0].args).toEqual({ p_actor: SESSION, p_request_id: REQ, p_reason: 'a'.repeat(500) })
  })
})

// ---- status ----

describe('POST status', () => {
  const status = (body: unknown) => post(statusRoute.POST as Handler, body)
  it.each(['in_progress', 'date_confirmed', 'deposit_requested', 'deposit_received', 'completed', 'declined', 'cancelled'])(
    'accepts %s and schedules the outbox even when no email will be queued', async to => {
      const f = setup()
      expect((await status({ to })).status).toBe(200)
      expect(lifecycleCalls(f)[0].args).toEqual({ p_actor: SESSION, p_request_id: REQ, p_to: to, p_reason: undefined })
      expect(h.scheduleOutbox).toHaveBeenCalledTimes(1)
    }
  )
  it('rejects pending, unknown and missing targets and a bad reason, with no RPC and no schedule', async () => {
    const f = setup()
    for (const body of [{}, { to: 'pending' }, { to: 'booked' }, { to: 5 }, { to: 'completed', reason: 5 }, { to: 'completed', reason: 'a'.repeat(501) }]) {
      expect((await status(body)).status).toBe(400)
    }
    expect(lifecycleCalls(f)).toHaveLength(0)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })
  it('passes a trimmed reason through, and treats a blank reason as none', async () => {
    const f = setup()
    await status({ to: 'in_progress', reason: '  reopening  ' })
    await status({ to: 'in_progress', reason: '   ' })
    expect(lifecycleCalls(f).map(c => c.args.p_reason)).toEqual(['reopening', undefined])
  })
})

// ---- notes ----

describe('POST notes', () => {
  const notes = (body: unknown) => post(notesRoute.POST as Handler, body)
  it('requires a trimmed, non-empty note of at most 2000 characters', async () => {
    const f = setup()
    for (const body of [{}, { note: '' }, { note: '  \n ' }, { note: 5 }, { note: 'a'.repeat(2001) }]) {
      expect((await notes(body)).status).toBe(400)
    }
    expect(lifecycleCalls(f)).toHaveLength(0)
    expect((await notes({ note: ` ${'a'.repeat(2000)} ` })).status).toBe(200)
    expect(lifecycleCalls(f)[0].args).toEqual({ p_actor: SESSION, p_request_id: REQ, p_note: 'a'.repeat(2000) })
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })
})

// ---- reassign (admin only, owner dispatch) ----

describe('POST reassign', () => {
  const reassign = (body: unknown) => post(reassignRoute.POST as Handler, body)
  const owned = { data: { coordinator_id: OTHER }, error: null }
  const unowned = { data: { coordinator_id: null }, error: null }

  it('is admin only: a non-admin or a failed admin check gets 403 with no lifecycle RPC and no body read', async () => {
    for (const admin of [{ data: false, error: null }, { data: null, error: { code: 'XX000', message: LEAK } }]) {
      const f = setup({ admin })
      const res = await post(reassignRoute.POST as Handler, 'not json', 'nope')
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ success: false, error: 'Forbidden' })
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(f.rpcCalls.map(c => c.fn)).toEqual(['tp_is_admin'])
      expect(f.calls).toHaveLength(0)
      expect(h.scheduleOutbox).not.toHaveBeenCalled()
    }
    expect(logged()).not.toContain('PGSECRET')
  })

  it('checks the admin status of the session user, after the capability and before validation', async () => {
    const f = setup()
    await reassign({ assignee_id: ASSIGNEE })
    expect(f.rpcCalls[0]).toEqual({ fn: 'tp_is_admin', args: { p_user_id: SESSION } })
  })

  it('validates the assignee and reason before reading the request', async () => {
    const f = setup()
    for (const body of [{}, { assignee_id: 'nope' }, { assignee_id: ASSIGNEE, reason: 5 }, { assignee_id: ASSIGNEE, reason: 'a'.repeat(501) }, { assignee_id: ASSIGNEE, extra: 1 }]) {
      expect((await reassign(body)).status).toBe(400)
    }
    expect(f.calls).toHaveLength(0)
    expect(lifecycleCalls(f)).toHaveLength(0)
  })

  it('an unowned request calls ONLY request_assign, with the reason optional', async () => {
    const f = setup({ owner: unowned })
    expect((await reassign({ assignee_id: ASSIGNEE })).status).toBe(200)
    expect((await reassign({ assignee_id: ASSIGNEE, reason: '  covering  ' })).status).toBe(200)
    expect(lifecycleCalls(f)).toEqual([
      { fn: 'request_assign', args: { p_actor: SESSION, p_request_id: REQ, p_assignee: ASSIGNEE, p_reason: undefined } },
      { fn: 'request_assign', args: { p_actor: SESSION, p_request_id: REQ, p_assignee: ASSIGNEE, p_reason: 'covering' } },
    ])
    expect(f.calls[0]).toMatchObject({ table: 'plan_requests', eq: { id: REQ } })
  })

  it('an owned request calls ONLY request_reassign with the reason', async () => {
    const f = setup({ owner: owned })
    expect((await reassign({ assignee_id: ASSIGNEE, reason: 'workload' })).status).toBe(200)
    expect(lifecycleCalls(f)).toEqual([
      { fn: 'request_reassign', args: { p_actor: SESSION, p_request_id: REQ, p_new_owner: ASSIGNEE, p_reason: 'workload' } },
    ])
  })

  it('an owned request without a reason is 422 from the route, before any lifecycle RPC', async () => {
    const f = setup({ owner: owned })
    for (const body of [{ assignee_id: ASSIGNEE }, { assignee_id: ASSIGNEE, reason: '   ' }, { assignee_id: ASSIGNEE, reason: null }]) {
      const res = await reassign(body)
      expect(res.status).toBe(422)
      expect(await res.json()).toEqual({ success: false, error: 'A reason is required to reassign this request' })
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    }
    expect(lifecycleCalls(f)).toHaveLength(0)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('a database ownership conflict is 409 and never falls back to the other function', async () => {
    // the route saw "unowned", but someone claimed it first
    let f = setup({ owner: unowned, lifecycle: { data: null, error: { code: 'RQ409', message: 'request already has an owner' } } })
    let res = await reassign({ assignee_id: ASSIGNEE })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ success: false, error: 'This request already has an owner' })
    expect(lifecycleCalls(f).map(c => c.fn)).toEqual(['request_assign'])

    // the route saw "owned", but it was released first
    vi.clearAllMocks()
    f = setup({ owner: owned, lifecycle: { data: null, error: { code: 'RQ409', message: 'request has no owner' } } })
    res = await reassign({ assignee_id: ASSIGNEE, reason: 'workload' })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ success: false, error: 'This request has no owner' })
    expect(lifecycleCalls(f).map(c => c.fn)).toEqual(['request_reassign'])
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('404 when the request does not exist, and a generic 500 when the owner read fails', async () => {
    let f = setup({ owner: { data: null, error: null } })
    expect((await reassign({ assignee_id: ASSIGNEE })).status).toBe(404)
    expect(lifecycleCalls(f)).toHaveLength(0)

    vi.clearAllMocks()
    f = setup({ owner: { data: null, error: { code: 'XX000', message: LEAK } } })
    const res = await reassign({ assignee_id: ASSIGNEE })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
    expect(lifecycleCalls(f)).toHaveLength(0)
    expect(logged()).not.toContain('PGSECRET')
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })

  it('schedules the outbox after every successful assign and reassign, including self-assignment', async () => {
    setup({ owner: unowned })
    await reassign({ assignee_id: SESSION }) // assigning to yourself queues no row, but the outbox still runs
    setup({ owner: owned })
    await reassign({ assignee_id: SESSION, reason: 'taking over' })
    await reassign({ assignee_id: ASSIGNEE, reason: 'workload' })
    expect(h.scheduleOutbox).toHaveBeenCalledTimes(3)
    expect(h.scheduleOutbox).toHaveBeenCalledWith(REQ)
  })

  it('does not schedule after a failed assign or reassign', async () => {
    setup({ owner: unowned, lifecycle: { data: null, error: { code: 'RQ422', message: 'assignee cannot manage requests' } } })
    expect((await reassign({ assignee_id: ASSIGNEE })).status).toBe(422)
    setup({ owner: owned, lifecycle: { data: null, error: { code: 'RQ422', message: 'new owner is not valid' } } })
    expect((await reassign({ assignee_id: ASSIGNEE, reason: 'x' })).status).toBe(422)
    expect(h.scheduleOutbox).not.toHaveBeenCalled()
  })
})

// ---- assignable owners ----

describe('GET assignable-owners', () => {
  const U1 = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  const U2 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  const U3 = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  // The RPC and the profile read both carry extra fields that must never reach the response.
  const eligible = {
    data: [
      { coordinator_id: U2, is_admin: true, specialist_type_keys: ['x'] },
      { coordinator_id: U1, is_admin: false, specialist_type_keys: ['event_planner'] },
      { coordinator_id: U3, is_admin: false, specialist_type_keys: [] },
      { coordinator_id: U1, is_admin: false, specialist_type_keys: ['event_planner'] }, // duplicate id
    ],
    error: null,
  }
  const profiles = {
    data: [
      { id: U1, first_name: 'Zed', last_name: 'Planner', email: 'z@x.com', role: 'user' },
      { id: U2, first_name: 'Ann', last_name: null, email: 'a@x.com', role: 'admin' },
      // U3 has no profile row
    ],
    error: null,
  }

  it('checks the capability first, then admin, and never reaches the database when denied', async () => {
    deny(401, 'Not authenticated')
    let f = setup()
    expect((await getOwners()).status).toBe(401)
    expect(f.rpcCalls).toHaveLength(0)
    expect(f.calls).toHaveLength(0)

    deny(403, 'Forbidden')
    f = setup()
    expect((await getOwners()).status).toBe(403)
    expect(f.rpcCalls).toHaveLength(0)

    allow()
    f = setup()
    await getOwners()
    expect(h.requireCapability).toHaveBeenLastCalledWith(expect.anything(), 'events.requests.manage', 'allow')
    expect(f.rpcCalls[0]).toEqual({ fn: 'tp_is_admin', args: { p_user_id: SESSION } })
  })

  it('a non-admin gets 403 and the eligible list is never read', async () => {
    const f = setup({ admin: { data: false, error: null }, eligible, profiles })
    const res = await getOwners()
    expect(res.status).toBe(403)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(f.rpcCalls.map(c => c.fn)).toEqual(['tp_is_admin'])
    expect(f.calls).toHaveLength(0)
  })

  it('returns only id and name, sorted, with the fallback name, and no emails or roles', async () => {
    const f = setup({ eligible, profiles })
    const res = await getOwners()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const json = await res.json()
    expect(json).toEqual({
      success: true,
      data: {
        owners: [
          { id: U2, name: 'Ann' },
          { id: U3, name: 'Staff member' }, // no profile row
          { id: U1, name: 'Zed Planner' },
        ],
      },
    })
    expect(JSON.stringify(json)).not.toMatch(/@|role|is_admin|specialist|event_planner|admin/i)
    expect(f.calls.map(c => c.table)).toEqual(['profiles'])
    expect(f.calls[0].in.id).toEqual([U2, U1, U3]) // duplicates removed
  })

  it('falls back to "Staff member" for blank names', async () => {
    setup({
      eligible: { data: [{ coordinator_id: U1 }, { coordinator_id: U2 }], error: null },
      profiles: { data: [{ id: U1, first_name: '  ', last_name: '' }, { id: U2, first_name: null, last_name: null }], error: null },
    })
    const json = await (await getOwners()).json()
    expect(json.data.owners.map((o: { name: string }) => o.name)).toEqual(['Staff member', 'Staff member'])
  })

  it('returns an empty list without a profile read when nobody is eligible', async () => {
    const f = setup({ eligible: { data: [], error: null } })
    expect(await (await getOwners()).json()).toEqual({ success: true, data: { owners: [] } })
    expect(f.calls).toHaveLength(0)
  })

  it('maps a failed eligible or profile read to a generic 500 without leaking text', async () => {
    setup({ eligible: { data: null, error: { code: 'XX000', message: LEAK } } })
    let res = await getOwners()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })

    setup({ eligible, profiles: { data: null, error: { code: 'XX000', message: LEAK } } })
    res = await getOwners()
    expect(res.status).toBe(500)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(logged()).not.toContain('PGSECRET')
  })

  it('exports only GET', () => {
    expect(Object.keys(ownersRoute).filter(k => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(k))).toEqual(['GET'])
  })
})
