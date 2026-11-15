import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, type FakeResult } from '@/lib/test-support/fake-supabase'
import { loadSavedDayPlans } from '@/lib/day-plan-read'

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BIZ = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const rows = [
  { id: 'p1', plan_date: '2026-11-20', total_estimated_spend: 30, total_duration_minutes: 90, created_at: 'x',
    stops: [
      { stop: { business_id: BIZ, name: 'Cafe', category: 'cafe', estimated_arrival: '12:00', estimated_spend: 10, logo_url: 'https://client/fake.png' }, segment: 'afternoon' },
      { stop: { business_id: OTHER, name: 'Bar', category: 'bar', estimated_arrival: '21:00', estimated_spend: 20 } },
      { name: 'Old flat stop', time: '9:00 PM', estimatedSpend: 5 },
    ] },
]

function setup(o: { plans?: FakeResult; businesses?: FakeResult } = {}) {
  return fakeSupabase({
    respond: q => {
      if (q.table === 'day_plans') return o.plans ?? { data: rows, error: null }
      if (q.table === 'businesses') return o.businesses ?? { data: [
        { id: BIZ, logo_url: 'https://cdn/biz.png', cover_image_url: 'https://cdn/biz-cover.jpg' },
        { id: OTHER, logo_url: 'javascript:alert(1)', cover_image_url: 'data:image/png;base64,AA' },
      ], error: null }
      return { data: null, error: null }
    },
  })
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('loadSavedDayPlans', () => {
  it('scopes the read to the given user and resolves logos from businesses only', async () => {
    const f = setup()
    const plans = await loadSavedDayPlans(f.client, USER)
    expect(f.calls[0]).toMatchObject({ table: 'day_plans', eq: { user_id: USER } })
    expect(f.calls[1]).toMatchObject({ table: 'businesses', in: { id: [BIZ, OTHER] } })
    expect(plans[0].stops.map(s => s.logo_url)).toEqual(['https://cdn/biz.png', null, null])
    expect(plans[0].stops.map(s => s.cover_image_url)).toEqual(['https://cdn/biz-cover.jpg', null, null])
    expect(JSON.stringify(plans)).not.toContain('client/fake.png')
    expect(JSON.stringify(plans)).not.toMatch(/javascript:|data:image/)
  })

  it('skips the logo lookup when no stop has a business id', async () => {
    const f = setup({ plans: { data: [{ id: 'p', stops: [{ name: 'X' }] }], error: null } })
    await loadSavedDayPlans(f.client, USER)
    expect(f.calls.map(c => c.table)).toEqual(['day_plans'])
  })

  it('returns [] on a read error and plans without logos on a lookup error', async () => {
    expect(await loadSavedDayPlans(setup({ plans: { data: null, error: { code: '42501', message: 'PGSECRET' } } }).client, USER)).toEqual([])
    const plans = await loadSavedDayPlans(setup({ businesses: { data: null, error: { code: 'x' } } }).client, USER)
    expect(plans[0].stops.every(s => s.logo_url === null && s.cover_image_url === null)).toBe(true)
  })

  it('returns [] when the client throws', async () => {
    expect(await loadSavedDayPlans({ from: () => { throw new Error('boom') } }, USER)).toEqual([])
  })
})
