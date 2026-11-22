import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

// The real requireAdmin runs: only the session lookup and the database client are replaced.
const h = vi.hoisted(() => ({ getUser: vi.fn(), createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ auth: { getUser: h.getUser } })) }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import * as route from './route'

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '177bdc51-70e3-40ea-af45-7a2b86a2e529'
const LEAK = 'PGSECRET detail from postgres'
const NOW = '2026-11-22T10:00:00.000Z'

type Err = { code?: string; message?: string }
interface Opts {
  signedIn?: boolean
  isAdmin?: boolean
  adminError?: Err
  userExists?: boolean
  alias?: string | null
  special?: boolean
  upsertError?: Err
}

// A small local stub: the shared fake has no upsert. Records the upsert payload.
function setup(o: Opts = {}) {
  h.getUser.mockResolvedValue(
    o.signedIn === false
      ? { data: { user: null }, error: { message: 'no session' } }
      : { data: { user: { id: ADMIN } }, error: null }
  )
  const upserts: Array<{ payload: Record<string, unknown>; options: unknown }> = []
  const rpcCalls: string[] = []
  const client = {
    from(table: string) {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: o.userExists === false ? null : { id: USER }, error: null }) }) }) }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: o.alias ? { alias: o.alias, updated_at: NOW } : null, error: null }),
          }),
        }),
        upsert: (payload: Record<string, unknown>, options: unknown) => {
          upserts.push({ payload, options })
          return {
            select: () => ({
              single: () =>
                Promise.resolve(
                  o.upsertError
                    ? { data: null, error: o.upsertError }
                    : { data: { user_id: payload.user_id, alias: payload.alias, updated_at: NOW }, error: null }
                ),
            }),
          }
        },
      }
    },
    rpc(fn: string) {
      rpcCalls.push(fn)
      if (fn === 'tp_is_admin') {
        return Promise.resolve(o.adminError ? { data: null, error: o.adminError } : { data: o.isAdmin !== false, error: null })
      }
      if (fn === 'is_special_user') return Promise.resolve({ data: o.special === true, error: null })
      return Promise.resolve({ data: null, error: null })
    },
  }
  h.createSupabaseAdmin.mockReturnValue(client)
  return { upserts, rpcCalls }
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const get = (id = USER) =>
  route.GET(new Request(`http://localhost/api/v1/admin/users/${id}/alias`) as unknown as NextRequest, ctx(id))
const put = (body: unknown, id = USER) =>
  route.PUT(
    new Request(`http://localhost/api/v1/admin/users/${id}/alias`, {
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }) as unknown as NextRequest,
    ctx(id)
  )
const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('authorization (both methods, always no-store)', () => {
  it('401 when signed out and 403 for a non-admin: the database is never touched', async () => {
    for (const call of [() => get(), () => put({ alias: 'jane_doe' })]) {
      let f = setup({ signedIn: false })
      let res = await call()
      expect(res.status).toBe(401)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(f.rpcCalls).toEqual([])

      f = setup({ isAdmin: false })
      res = await call()
      expect(res.status).toBe(403)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(f.upserts).toHaveLength(0)
    }
  })

  it('403 when the admin check errors, without leaking the error', async () => {
    setup({ adminError: { code: 'XX000', message: LEAK } })
    const res = await put({ alias: 'jane_doe' })
    expect(res.status).toBe(403)
    expect(await res.text()).not.toContain(LEAK)
  })
})

describe('GET', () => {
  it('returns the alias, updated_at and is_special and nothing else', async () => {
    setup({ alias: 'jane_doe', special: true })
    const res = await get()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(body.data).toEqual({ user_id: USER, alias: 'jane_doe', updated_at: NOW, is_special: true })
  })

  it('a special user with no alias yet reports null', async () => {
    setup({ alias: null, special: true })
    const body = await (await get()).json()
    expect(body.data).toEqual({ user_id: USER, alias: null, updated_at: null, is_special: true })
  })

  it('400 for a bad id and 404 for an unknown user', async () => {
    setup()
    expect((await get('not-a-uuid')).status).toBe(400)
    setup({ userExists: false })
    expect((await get()).status).toBe(404)
  })
})

describe('PUT', () => {
  it('creates an alias for a user who has none, with updated_by from the session', async () => {
    const f = setup({ alias: null })
    const res = await put({ alias: 'jane_doe' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(body.data).toEqual({ user_id: USER, alias: 'jane_doe', updated_at: NOW })
    expect(f.upserts).toHaveLength(1)
    expect(f.upserts[0].payload).toEqual({ user_id: USER, alias: 'jane_doe', updated_by: ADMIN })
    expect(f.upserts[0].options).toEqual({ onConflict: 'user_id' })
  })

  it('renames a user who already has an alias', async () => {
    const f = setup({ alias: 'old_name' })
    const res = await put({ alias: 'new_name' })
    expect(res.status).toBe(200)
    expect(f.upserts[0].payload.alias).toBe('new_name')
  })

  it('setting the alias a user already has is fine (idempotent)', async () => {
    const f = setup({ alias: 'jane_doe' })
    const res = await put({ alias: 'jane_doe' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.alias).toBe('jane_doe')
    expect(f.upserts).toHaveLength(1)
  })

  it('normalises the input (leading @, case, spaces) before saving', async () => {
    const f = setup()
    await put({ alias: '  @Jane_Doe ' })
    expect(f.upserts[0].payload.alias).toBe('jane_doe')
  })

  it('never takes updated_by (or any other field) from the body', async () => {
    const f = setup()
    const res = await put({ alias: 'jane_doe', updated_by: 'evil' })
    expect(res.status).toBe(400)
    expect(f.upserts).toHaveLength(0)
  })

  it('400 for bad JSON, a non-object body, bad id, and bad values: nothing is written', async () => {
    const f = setup()
    expect((await put('{nope')).status).toBe(400)
    expect((await put([])).status).toBe(400)
    expect((await put({})).status).toBe(400)
    expect((await put({ alias: 'ab' })).status).toBe(400)
    expect((await put({ alias: 'has space' })).status).toBe(400)
    expect((await put({ alias: 'a'.repeat(31) })).status).toBe(400)
    expect((await put({ alias: 'admin' })).status).toBe(400)
    expect((await put({ alias: 'jane_doe' }, 'not-a-uuid')).status).toBe(400)
    expect(f.upserts).toHaveLength(0)
  })

  it('404 for an unknown user', async () => {
    const f = setup({ userExists: false })
    expect((await put({ alias: 'jane_doe' })).status).toBe(404)
    expect(f.upserts).toHaveLength(0)
  })

  it('maps a taken alias to 409 with a fixed message', async () => {
    setup({ upsertError: { code: '23505', message: LEAK } })
    const res = await put({ alias: 'jane_doe' })
    expect(res.status).toBe(409)
    const text = await res.text()
    expect(text).toContain('That alias is already taken.')
    expect(text).not.toContain(LEAK)
    expect(logged()).not.toContain(LEAK)
  })

  it('maps the database reserved-word error to 400 with the database message', async () => {
    setup({ upsertError: { code: 'P0001', message: 'That alias is reserved.' } })
    const res = await put({ alias: 'jane_doe' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('That alias is reserved.')
  })

  it('maps a format violation to 400', async () => {
    setup({ upsertError: { code: '23514', message: LEAK } })
    const res = await put({ alias: 'jane_doe' })
    expect(res.status).toBe(400)
    expect(await res.text()).not.toContain(LEAK)
  })

  it('any other P0001 and any unknown error are a fixed 500 that leaks nothing', async () => {
    for (const err of [{ code: 'P0001', message: LEAK }, { code: 'XX000', message: LEAK }]) {
      setup({ upsertError: err })
      const res = await put({ alias: 'jane_doe' })
      expect(res.status).toBe(500)
      expect(await res.text()).not.toContain(LEAK)
    }
  })
})
