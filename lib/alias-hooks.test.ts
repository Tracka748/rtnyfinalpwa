import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '@/lib/test-support/fake-supabase'
import { ensureAliasSafe } from './alias-hooks'

const USER = '177bdc51-70e3-40ea-af45-7a2b86a2e529'
const ROUTE = 'admin/users/[id]/role PATCH'

const logged = () => (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ensureAliasSafe', () => {
  it('calls ensure_alias once with the user id', async () => {
    const f = fakeSupabase({ rpc: () => ({ data: 'jane_doe', error: null }) })
    await ensureAliasSafe(f.client, USER, ROUTE)
    expect(f.rpcCalls).toEqual([{ fn: 'ensure_alias', args: { p_user_id: USER } }])
    expect(logged()).toHaveLength(0)
  })

  it('does nothing for a missing, non-string or malformed id', async () => {
    const f = fakeSupabase({})
    for (const v of [null, undefined, '', 5, {}, 'not-a-uuid']) await ensureAliasSafe(f.client, v, ROUTE)
    expect(f.rpcCalls).toHaveLength(0)
  })

  it('logs route, user_id, code and message when the rpc returns an error, and does not throw', async () => {
    const f = fakeSupabase({ rpc: () => ({ data: null, error: { code: 'P0001', message: 'Could not find a free alias.' } }) })
    await expect(ensureAliasSafe(f.client, USER, ROUTE)).resolves.toBeUndefined()
    expect(logged()).toEqual([[
      '[alias] ensure_alias failed',
      { route: ROUTE, user_id: USER, code: 'P0001', message: 'Could not find a free alias.' },
    ]])
  })

  it('swallows a thrown error too', async () => {
    const f = fakeSupabase({ rpc: () => { throw new Error('boom') } })
    await expect(ensureAliasSafe(f.client, USER, ROUTE)).resolves.toBeUndefined()
    expect(logged()).toHaveLength(1)
    expect((logged()[0][1] as { code: unknown; message: string }).code).toBeNull()
    expect((logged()[0][1] as { message: string }).message).toBe('boom')
  })
})
