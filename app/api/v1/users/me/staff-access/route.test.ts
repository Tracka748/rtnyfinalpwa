import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: () => ({ rpc }) }))

import { GET } from './route'

const USER = '11111111-1111-4111-8111-111111111111'
const LEAK = 'PGSECRET detail from postgres'

const answers = (view: unknown, admin: unknown = { data: false, error: null }) =>
  rpc.mockImplementation(async (fn: string) => (fn === 'specialist_can' ? view : admin))

async function call() {
  const res = await GET()
  const text = await res.text()
  return { status: res.status, cache: res.headers.get('Cache-Control'), text, json: JSON.parse(text) }
}
const logged = () => JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)

beforeEach(() => {
  getUser.mockReset()
  rpc.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getUser.mockResolvedValue({ data: { user: { id: USER, email: 'staff@example.com' } }, error: null })
})

describe('GET /api/v1/users/me/staff-access', () => {
  it('signed out: 200 with can_view false, no-store, and the database is never called', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    const r = await call()
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ success: true, data: { can_view: false } })
    expect(r.cache).toBe('no-store')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('a session error or a thrown session lookup is still a quiet false', async () => {
    getUser.mockResolvedValue({ data: { user: { id: USER } }, error: { message: 'bad jwt' } })
    expect((await call()).json.data.can_view).toBe(false)
    getUser.mockRejectedValue(new Error(LEAK))
    const r = await call()
    expect(r.status).toBe(200)
    expect(r.json.data.can_view).toBe(false)
    expect(r.text).not.toContain('PGSECRET')
    expect(logged()).not.toContain('PGSECRET')
  })

  it('an admin is true', async () => {
    answers({ data: true, error: null }, { data: true, error: null })
    const r = await call()
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ success: true, data: { can_view: true } })
    expect(r.cache).toBe('no-store')
  })

  it('a specialist with events.requests.view is true', async () => {
    answers({ data: true, error: null })
    expect((await call()).json.data.can_view).toBe(true)
  })

  it('a specialist without view, and an ordinary customer, are false', async () => {
    answers({ data: false, error: null })
    const r = await call()
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ success: true, data: { can_view: false } })
    expect(r.cache).toBe('no-store')
  })

  it('asks for events.requests.view at the allow level for the session user, and nothing client-supplied', async () => {
    answers({ data: true, error: null })
    await call()
    expect(rpc).toHaveBeenCalledWith('specialist_can', {
      p_user_id: USER, p_capability: 'events.requests.view', p_required: 'allow',
    })
  })

  it('fails closed on an RPC error, a non-true answer or a thrown error, with no error status and no raw text', async () => {
    const cases: Array<() => void> = [
      () => answers({ data: null, error: { code: 'XX000', message: LEAK } }),
      () => answers({ data: 'true', error: null }),
      () => answers({ data: 1, error: null }),
      () => answers({ data: null, error: null }),
      () => rpc.mockRejectedValue(new Error(LEAK)),
    ]
    for (const arrange of cases) {
      arrange()
      const r = await call()
      expect(r.status).toBe(200)
      expect(r.json).toEqual({ success: true, data: { can_view: false } })
      expect(r.cache).toBe('no-store')
      expect(r.text).not.toContain('PGSECRET')
    }
    expect(logged()).not.toContain('PGSECRET')
  })

  it('the body carries only can_view: no user id, email or role', async () => {
    answers({ data: true, error: null }, { data: true, error: null })
    const r = await call()
    expect(Object.keys(r.json).sort()).toEqual(['data', 'success'])
    expect(Object.keys(r.json.data)).toEqual(['can_view'])
    expect(r.text).not.toContain(USER)
    expect(r.text).not.toContain('staff@example.com')
  })
})
