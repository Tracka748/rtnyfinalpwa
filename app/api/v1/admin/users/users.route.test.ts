import { beforeEach, describe, expect, it, vi } from 'vitest'

// This route builds its own clients and guard inline, so those modules are replaced here.
const h = vi.hoisted(() => ({ checkIsAdmin: vi.fn(), createClient: vi.fn(), getUser: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ checkIsAdmin: h.checkIsAdmin }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser: h.getUser } })) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: h.createClient }))

import { NextResponse } from 'next/server'
import { fakeSupabase, type FakeResult, type Recorded } from '@/lib/test-support/fake-supabase'
import { GET } from './route'

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const U1 = '11111111-1111-4111-8111-111111111111' // promoter with an alias
const U2 = '22222222-2222-4222-8222-222222222222' // admin with no alias (a failed hook)
const U3 = '33333333-3333-4333-8333-333333333333' // ordinary user
const LEAK = 'PGSECRET detail from postgres'

const profile = (id: string, role: string, over: Record<string, unknown> = {}) => ({
  id, first_name: 'F', last_name: 'L', email: `${id}@x.com`, phone: null, role, created_at: '2026-11-01T00:00:00Z',
  neighborhood: null, age_range: null, gender: null, is_parent: null, bio: null, is_organizer: false, ...over,
})
const PROFILES = [profile(U1, 'promoter'), profile(U2, 'admin'), profile(U3, 'user')]

interface Opts { aliasResult?: FakeResult; profiles?: unknown[]; profilesResult?: FakeResult }

function setup(o: Opts = {}) {
  h.checkIsAdmin.mockResolvedValue({ error: false, response: null })
  h.getUser.mockResolvedValue({ data: { user: { id: ADMIN } } })
  const f = fakeSupabase({
    respond: (q: Recorded) => {
      if (q.table === 'profiles') return o.profilesResult ?? { data: o.profiles ?? PROFILES, error: null }
      if (q.table === 'user_aliases') return o.aliasResult ?? { data: [{ user_id: U1, alias: 'jane_doe' }], error: null }
      if (q.table === 'orders') return { data: [{ user_id: U3, total_amount: 20 }], error: null }
      if (q.table === 'promoters') return { data: [{ user_id: U1, display_name: 'Jane', instagram_handle: null, status: 'approved' }], error: null }
      return { data: [], error: null } // partners, user_specialist_assignments
    },
  })
  h.createClient.mockReturnValue(f.client)
  return f
}

const get = (query = '') => GET(new Request(`http://localhost/api/v1/admin/users${query}`))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/v1/admin/users: guard', () => {
  it('returns the guard response untouched and reads nothing for a non-admin', async () => {
    const f = setup()
    h.checkIsAdmin.mockResolvedValue({ error: true, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) })
    const res = await get()
    expect(res.status).toBe(403)
    expect(f.calls).toHaveLength(0)
  })
})

describe('GET /api/v1/admin/users: alias and special flag', () => {
  it('all tab: keeps the existing fields and adds alias, is_special and is_organizer', async () => {
    setup()
    const body = await (await get()).json()
    expect(body.success).toBe(true)
    expect(body.meta).toEqual({ currentProfileId: ADMIN })
    const [a, b, c] = body.data
    expect(a).toMatchObject({ id: U1, role: 'promoter', alias: 'jane_doe', is_special: true, order_count: 0, total_spent: 0 })
    expect(b).toMatchObject({ id: U2, role: 'admin', alias: null, is_special: true }) // special with no alias
    expect(c).toMatchObject({ id: U3, role: 'user', alias: null, is_special: false, order_count: 1, total_spent: 20 })
    expect(a.is_organizer).toBe(false)
    expect(body.data.map((u: { id: string }) => u.id)).toEqual([U1, U2, U3])
  })

  it('promoters tab: keeps the promoter object and adds the alias fields', async () => {
    setup({ profiles: [profile(U1, 'promoter')] })
    const body = await (await get('?tab=promoters')).json()
    expect(body.data[0]).toMatchObject({ id: U1, alias: 'jane_doe', is_special: true, promoter: { display_name: 'Jane', status: 'approved' } })
  })

  it('organizers and admins tabs carry the alias fields too', async () => {
    setup({ profiles: [profile(U2, 'admin')] })
    for (const tab of ['organizers', 'admins']) {
      const body = await (await get(`?tab=${tab}`)).json()
      expect(body.data[0]).toMatchObject({ id: U2, alias: null, is_special: true })
    }
  })

  it('queries aliases only for the loaded ids', async () => {
    const f = setup()
    await get()
    const aliasCall = f.calls.find(c => c.table === 'user_aliases') as Recorded
    expect(aliasCall.in.user_id).toEqual([U1, U2, U3])
  })

  it('makes no alias queries when there are no users', async () => {
    const f = setup({ profiles: [] })
    const body = await (await get()).json()
    expect(body.data).toEqual([])
    expect(f.calls.some(c => c.table === 'user_aliases')).toBe(false)
  })

  it('fails soft: if the alias lookup fails the list is still 200, without alias fields, and nothing leaks', async () => {
    setup({ aliasResult: { data: null, error: { code: '42P01', message: LEAK } } })
    const res = await get()
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).not.toContain(LEAK)
    const body = JSON.parse(text)
    expect(body.data).toHaveLength(3)
    for (const u of body.data) {
      expect('alias' in u).toBe(false)
      expect('is_special' in u).toBe(false)
    }
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain(LEAK)
  })
})
