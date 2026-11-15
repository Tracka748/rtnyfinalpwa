import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: () => ({ rpc }) }))

import { decideStaffAccess, getStaffAccess } from '@/lib/staff-auth'

const USER = '11111111-1111-1111-1111-111111111111'
const LEAK = 'PGSECRET detail from postgres'

const answers = (view: unknown, admin: unknown = false) =>
  rpc.mockImplementation(async (fn: string) => (fn === 'specialist_can' ? view : admin))
const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

beforeEach(() => {
  getUser.mockReset()
  rpc.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getUser.mockResolvedValue({ data: { user: { id: USER, email: 'staff@example.com' } }, error: null })
})

describe('decideStaffAccess', () => {
  it('no user is signed out, whatever else is true', () => {
    expect(decideStaffAccess({ userId: null, canView: true, isAdmin: true })).toEqual({ state: 'signed_out' })
    expect(decideStaffAccess({ userId: '', canView: true, isAdmin: true })).toEqual({ state: 'signed_out' })
  })

  it('only an exact true for the capability is allowed', () => {
    for (const canView of [false, null, undefined, 'true', 1, {}, []]) {
      expect(decideStaffAccess({ userId: USER, canView, isAdmin: true })).toEqual({ state: 'denied' })
    }
    expect(decideStaffAccess({ userId: USER, canView: true, isAdmin: false, email: 'a@b.com' })).toEqual({ state: 'allowed', isAdmin: false, email: 'a@b.com' })
  })

  it('only an exact true is admin', () => {
    for (const isAdmin of [false, null, undefined, 'true', 1]) {
      expect(decideStaffAccess({ userId: USER, canView: true, isAdmin })).toMatchObject({ state: 'allowed', isAdmin: false })
    }
    expect(decideStaffAccess({ userId: USER, canView: true, isAdmin: true })).toMatchObject({ isAdmin: true })
  })
})

describe('getStaffAccess', () => {
  it('signed out when there is no session, and never calls the database', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getStaffAccess()).toEqual({ state: 'signed_out' })
    getUser.mockResolvedValue({ data: { user: { id: USER } }, error: { message: 'bad jwt' } })
    expect(await getStaffAccess()).toEqual({ state: 'signed_out' })
    getUser.mockRejectedValue(new Error(LEAK))
    expect(await getStaffAccess()).toEqual({ state: 'signed_out' })
    expect(rpc).not.toHaveBeenCalled()
    expect(logged()).not.toContain('PGSECRET')
  })

  it('checks events.requests.view at allow for the session user', async () => {
    answers({ data: true, error: null })
    await getStaffAccess()
    expect(rpc).toHaveBeenCalledWith('specialist_can', { p_user_id: USER, p_capability: 'events.requests.view', p_required: 'allow' })
  })

  it('allows a specialist with the capability, in the slim shell', async () => {
    answers({ data: true, error: null }, { data: false, error: null })
    expect(await getStaffAccess()).toEqual({ state: 'allowed', isAdmin: false, email: 'staff@example.com' })
  })

  it('allows an admin, who keeps the full shell', async () => {
    answers({ data: true, error: null }, { data: true, error: null })
    expect(await getStaffAccess()).toEqual({ state: 'allowed', isAdmin: true, email: 'staff@example.com' })
  })

  it('denies a signed-in user without the capability, and does not look up admin status', async () => {
    answers({ data: false, error: null }, { data: true, error: null })
    expect(await getStaffAccess()).toEqual({ state: 'denied' })
    expect(rpc.mock.calls.map(c => c[0])).toEqual(['specialist_can'])
  })

  it('fails closed on an RPC error, a non-true answer or a thrown error, logging only a code', async () => {
    answers({ data: null, error: { code: 'XX000', message: LEAK } })
    expect(await getStaffAccess()).toEqual({ state: 'denied' })
    answers({ data: 'true', error: null })
    expect(await getStaffAccess()).toEqual({ state: 'denied' })
    answers({ data: null, error: null })
    expect(await getStaffAccess()).toEqual({ state: 'denied' })
    rpc.mockRejectedValue(new Error(LEAK))
    expect(await getStaffAccess()).toEqual({ state: 'denied' })
    expect(logged()).not.toContain('PGSECRET')
    expect(logged()).toContain('[staff-auth] capability check: code=XX000')
  })

  it('an admin-status failure only means the slim shell, never a denial', async () => {
    answers({ data: true, error: null }, { data: null, error: { code: 'XX000', message: LEAK } })
    expect(await getStaffAccess()).toEqual({ state: 'allowed', isAdmin: false, email: 'staff@example.com' })
    expect(logged()).not.toContain('PGSECRET')
  })
})
