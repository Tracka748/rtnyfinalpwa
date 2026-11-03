import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireCapability: vi.fn(),
  requireUser: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}))

vi.mock('@/lib/authz', async () => {
  const actual = await vi.importActual<typeof import('@/lib/authz')>('@/lib/authz')
  return { ...actual, requireAdmin: h.requireAdmin, requireCapability: h.requireCapability, requireUser: h.requireUser }
})
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase, type Recorded } from '@/lib/test-support/fake-supabase'
import { PUT } from './[id]/versions/[versionId]/draft/route'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PKG = '11111111-1111-1111-1111-111111111111'
const VER = '22222222-2222-2222-2222-222222222222'
const UPDATED_AT = '2026-11-02T12:00:00Z'

function setup(opts: { owned?: boolean; rpcResult?: { data: unknown; error: unknown }; readError?: boolean } = {}) {
  const { owned = true, rpcResult = { data: 5, error: null }, readError = false } = opts
  const f = fakeSupabase({
    respond: (q: Recorded) => {
      if ('package_id' in q.eq) return { data: owned ? { id: VER } : null, error: null } // ownership check
      return readError ? { data: null, error: { code: 'XX000', message: 'boom' } } : { data: { updated_at: UPDATED_AT }, error: null }
    },
    rpc: () => rpcResult,
  })
  h.createSupabaseAdmin.mockReturnValue(f.client)
  return f
}

const put = (body: unknown, params = { id: PKG, versionId: VER }) =>
  PUT(
    new Request('http://localhost/api/test', { method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as unknown as NextRequest,
    { params: Promise.resolve(params) }
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.requireCapability.mockResolvedValue({ error: false, response: null, userId: SESSION })
})

describe('PUT draft', () => {
  it('passes the session user as p_actor, the URL version, and nulls for omitted parts', async () => {
    const f = setup()
    const res = await put({ expected_revision: 4, meta: { title: 'New title' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { revision: 5, updated_at: UPDATED_AT } })
    expect(f.rpcCalls).toEqual([{
      fn: 'theme_package_save_draft',
      args: { p_version_id: VER, p_actor: SESSION, p_expected_revision: 4, p_meta: { title: 'New title' }, p_components: null },
    }])
  })

  it('passes components through and a null meta when only components are sent', async () => {
    const f = setup()
    await put({ expected_revision: 1, components: [{ slot_label: 'Cake' }] })
    expect(f.rpcCalls[0].args).toMatchObject({
      p_actor: SESSION,
      p_meta: null,
      p_components: [{ slot_label: 'Cake', requirement: 'required', quantity: 1, notes: null }],
    })
  })

  it.each(['actor', 'p_actor', 'actor_id', 'updated_by', 'user_id', 'role'])(
    'rejects a body "%s" key with 400 before the rpc is called',
    async key => {
      const f = setup()
      const res = await put({ expected_revision: 1, meta: { title: 'x' }, [key]: OTHER })
      expect(res.status).toBe(400)
      expect((await res.json()).error).toContain('Unknown field')
      expect(f.rpcCalls).toHaveLength(0)
      expect(h.createSupabaseAdmin).not.toHaveBeenCalled() // rejected before any DB work
    }
  )

  it('rejects an actor smuggled inside meta or a component', async () => {
    const f = setup()
    expect((await put({ expected_revision: 1, meta: { title: 'x', updated_by: OTHER } })).status).toBe(400)
    expect((await put({ expected_revision: 1, components: [{ slot_label: 'A', actor: OTHER }] })).status).toBe(400)
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('rejects a missing or non-integer expected_revision before the rpc', async () => {
    const f = setup()
    expect((await put({ meta: { title: 'x' } })).status).toBe(400)
    expect((await put({ expected_revision: 1.5, meta: { title: 'x' } })).status).toBe(400)
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('400 on malformed url params, without any DB work', async () => {
    const f = setup()
    expect((await put({ expected_revision: 1, meta: { title: 'x' } }, { id: 'nope', versionId: VER })).status).toBe(400)
    expect(f.rpcCalls).toHaveLength(0)
    expect(h.createSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('404 and no rpc when the version is not in the package from the URL', async () => {
    const f = setup({ owned: false })
    const res = await put({ expected_revision: 1, meta: { title: 'x' } })
    expect(res.status).toBe(404)
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('RT409 from the rpc -> 409 with our message', async () => {
    setup({ rpcResult: { data: null, error: { code: 'RT409', message: 'this draft was changed by someone else; reload it and try again' } } })
    const res = await put({ expected_revision: 1, meta: { title: 'x' } })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('this draft was changed by someone else; reload it and try again')
  })

  it('P0001 from the rpc -> 400 with the DB message; 42501 -> 403', async () => {
    setup({ rpcResult: { data: null, error: { code: 'P0001', message: 'version is approved and cannot be edited' } } })
    const bad = await put({ expected_revision: 1, meta: { title: 'x' } })
    expect(bad.status).toBe(400)
    expect((await bad.json()).error).toBe('version is approved and cannot be edited')
    setup({ rpcResult: { data: null, error: { code: '42501', message: 'not permitted to edit package drafts' } } })
    expect((await put({ expected_revision: 1, meta: { title: 'x' } })).status).toBe(403)
  })

  it('still returns the new revision when the updated_at read fails', async () => {
    setup({ readError: true })
    const res = await put({ expected_revision: 1, meta: { title: 'x' } })
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ revision: 5, updated_at: null })
  })
})
