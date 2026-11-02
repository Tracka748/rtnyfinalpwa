import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}))
vi.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: () => ({ rpc }),
}))

import { CAPABILITIES, requireAdmin, requireCapability, requireUser } from '@/lib/authz'

const USER_ID = '11111111-1111-1111-1111-111111111111'

function req(init?: { headers?: Record<string, string>; body?: unknown }) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: init?.headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  }) as unknown as NextRequest
}

async function bodyOf(res: Response) {
  return res.json()
}

beforeEach(() => {
  getUser.mockReset()
  rpc.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
})

describe('requireUser', () => {
  it('returns 401 when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const auth = await requireUser(req())
    expect(auth.error).toBe(true)
    expect(auth.response?.status).toBe(401)
    expect(await bodyOf(auth.response!)).toEqual({ success: false, error: 'Not authenticated' })
  })

  it('returns 401 when getUser errors or throws', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } })
    expect((await requireUser(req())).response?.status).toBe(401)
    getUser.mockRejectedValue(new Error('boom'))
    expect((await requireUser(req())).response?.status).toBe(401)
  })

  it('returns the verified user id', async () => {
    const auth = await requireUser(req())
    expect(auth).toEqual({ error: false, response: null, userId: USER_ID })
  })
})

describe('requireCapability', () => {
  it('returns 401 without calling the rpc when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_VIEW)
    expect(auth.response?.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('denies an unknown capability key without calling the rpc', async () => {
    const auth = await requireCapability(req(), 'packages.approve' as never)
    expect(auth.response?.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('denies an invalid level without calling the rpc', async () => {
    const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_VIEW, 'root' as never)
    expect(auth.response?.status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('denies on rpc error and does not leak the Postgres message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'function public.specialist_can does not exist' },
    })
    const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_MANAGE)
    expect(auth.response?.status).toBe(403)
    const json = await bodyOf(auth.response!)
    expect(json).toEqual({ success: false, error: 'Forbidden' })
    expect(JSON.stringify(json)).not.toContain('specialist_can')
  })

  it('denies when the rpc throws', async () => {
    rpc.mockRejectedValue(new Error('network down'))
    const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_MANAGE)
    expect(auth.response?.status).toBe(403)
  })

  it('denies when the rpc result is not strictly true', async () => {
    for (const data of [null, undefined, 'true', 1, false]) {
      rpc.mockResolvedValue({ data, error: null })
      const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_VIEW)
      expect(auth.response?.status).toBe(403)
    }
  })

  it('allows an admin (rpc resolves true) and passes the verified id, capability and level', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    const auth = await requireCapability(req(), CAPABILITIES.PACKAGES_MANAGE, 'manage')
    expect(auth).toEqual({ error: false, response: null, userId: USER_ID })
    expect(rpc).toHaveBeenCalledWith('specialist_can', {
      p_user_id: USER_ID,
      p_capability: 'packages.manage',
      p_required: 'manage',
    })
  })

  it('defaults the level to allow', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    await requireCapability(req(), CAPABILITIES.CATALOG_VIEW)
    expect(rpc).toHaveBeenCalledWith('specialist_can', expect.objectContaining({ p_required: 'allow' }))
  })

  it('read_only specialist: passes read_only, fails manage (per rpc result)', async () => {
    // Emulates specialist_can for a user whose resolved access is read_only.
    rpc.mockImplementation(async (_fn: string, args: { p_required: string }) => ({
      data: args.p_required === 'read_only',
      error: null,
    }))
    const read = await requireCapability(req(), CAPABILITIES.CATALOG_VIEW, 'read_only')
    const manage = await requireCapability(req(), CAPABILITIES.CATALOG_VIEW, 'manage')
    expect(read.error).toBe(false)
    expect(manage.error).toBe(true)
    expect(manage.response?.status).toBe(403)
  })

  it('manage specialist: passes every level', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    for (const level of ['read_only', 'allow', 'manage'] as const) {
      expect((await requireCapability(req(), CAPABILITIES.PACKAGES_MANAGE, level)).error).toBe(false)
    }
  })
})

describe('requireAdmin', () => {
  it('returns 401 when there is no user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await requireAdmin(req())).response?.status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('allows an admin', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    const auth = await requireAdmin(req())
    expect(auth).toEqual({ error: false, response: null, userId: USER_ID })
    expect(rpc).toHaveBeenCalledWith('tp_is_admin', { p_user_id: USER_ID })
  })

  it('denies a non-admin, an rpc error and a thrown rpc', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    expect((await requireAdmin(req())).response?.status).toBe(403)
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'internal detail' } })
    const errored = await requireAdmin(req())
    expect(errored.response?.status).toBe(403)
    expect(JSON.stringify(await bodyOf(errored.response!))).not.toContain('internal detail')
    rpc.mockRejectedValue(new Error('boom'))
    expect((await requireAdmin(req())).response?.status).toBe(403)
  })
})

describe('client-supplied identity is ignored', () => {
  const spoofed = {
    headers: {
      'x-user-role': 'admin',
      'x-user-id': '99999999-9999-9999-9999-999999999999',
      'x-admin': 'true',
    },
    body: { role: 'admin', user_id: '99999999-9999-9999-9999-999999999999', is_admin: true },
  }

  it('requireUser uses the session id, not a header or body id', async () => {
    const auth = await requireUser(req(spoofed))
    expect(auth.userId).toBe(USER_ID)
  })

  it('requireAdmin checks the session id and denies a non-admin despite a role header/body', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    const auth = await requireAdmin(req(spoofed))
    expect(auth.response?.status).toBe(403)
    expect(rpc).toHaveBeenCalledWith('tp_is_admin', { p_user_id: USER_ID })
  })

  it('requireCapability checks the session id and denies despite a role header/body', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    const auth = await requireCapability(req(spoofed), CAPABILITIES.PACKAGES_MANAGE, 'manage')
    expect(auth.response?.status).toBe(403)
    expect(rpc).toHaveBeenCalledWith('specialist_can', expect.objectContaining({ p_user_id: USER_ID }))
  })
})
