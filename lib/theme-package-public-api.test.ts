import { describe, expect, it } from 'vitest'
import { RATE_LIMIT_PER_DAY, checkRequestAbuse, getVerifiedEmail, loadLiveDocument, resolveLivePackage } from '@/lib/theme-package-public-api'
import { fakeSupabase, type Recorded } from '@/lib/test-support/fake-supabase'

const PKG = { id: 'p1', key: 'spooky', occasion: 'Birthday', status: 'active', theme_id: 't1', live_version_id: 'v1' }
const VERSION = { id: 'v1', title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: null, max_guests: null, published_at: null }

function live(over: Record<string, unknown> = {}) {
  const t: Record<string, unknown> = { theme_packages: PKG, theme_package_versions: VERSION, themes: { id: 't1', name: 'Spooky' }, ...over }
  return fakeSupabase({ respond: (q: Recorded) => ({ data: t[q.table] ?? null, error: null }) })
}

describe('resolveLivePackage', () => {
  it('returns the live approved version of an active package', async () => {
    const f = live()
    const r = await resolveLivePackage(f.client, 'spooky')
    expect(r).toEqual({ pkg: { id: 'p1', key: 'spooky', occasion: 'Birthday' }, theme: { id: 't1', name: 'Spooky' }, version: VERSION })
    const versionQuery = f.calls.find(c => c.table === 'theme_package_versions')!
    expect(versionQuery.eq).toEqual({ id: 'v1', package_id: 'p1', status: 'approved' })
  })
  it('null for unknown, archived, not-live and non-approved-live keys', async () => {
    expect(await resolveLivePackage(live({ theme_packages: null }).client, 'nope')).toBeNull()
    expect(await resolveLivePackage(live({ theme_packages: { ...PKG, status: 'archived' } }).client, 'spooky')).toBeNull()
    expect(await resolveLivePackage(live({ theme_packages: { ...PKG, live_version_id: null } }).client, 'spooky')).toBeNull()
    expect(await resolveLivePackage(live({ theme_package_versions: null }).client, 'spooky')).toBeNull()
  })
  it('does not query versions for an archived package', async () => {
    const f = live({ theme_packages: { ...PKG, status: 'archived' } })
    await resolveLivePackage(f.client, 'spooky')
    expect(f.calls.map(c => c.table)).toEqual(['theme_packages'])
  })
  it('works without a theme', async () => {
    const r = await resolveLivePackage(live({ theme_packages: { ...PKG, theme_id: null } }).client, 'spooky')
    expect(r?.theme).toBeNull()
  })
  it('throws database errors (the route maps them)', async () => {
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000', message: 'boom' } }) })
    await expect(resolveLivePackage(f.client, 'spooky')).rejects.toMatchObject({ code: 'XX000' })
  })
})

describe('loadLiveDocument', () => {
  const comps = [{ id: 'c1', slot_label: 'Cake', sort_order: 0, requirement: 'required', quantity: 1, notes: null }]
  const opts = [{ id: 'o1', component_id: 'c1', catalog_item_id: 'i1', service_id: 's1', is_default: true, sort_order: 0 }]

  it('loads and projects the document', async () => {
    const tables: Record<string, unknown> = {
      theme_package_components: comps,
      theme_package_component_options: opts,
      catalog_items: [{ id: 'i1', name: 'Cake', description: null, item_type: 'food', image_url: null, status: 'active' }],
      vendor_services: [{ id: 's1', price: 50, pricing_model: 'flat', status: 'active', partner_id: 'pa1', vendor_id: null }],
      catalog_item_services: [{ catalog_item_id: 'i1', service_id: 's1', status: 'approved', price_treatment: 'listed' }],
      partners: [{ id: 'pa1', display_name: 'Cake Co' }],
    }
    const f = fakeSupabase({ respond: q => ({ data: tables[q.table] ?? [], error: null }) })
    const d = await loadLiveDocument(f.client, (await resolveLivePackage(live().client, 'spooky'))!)
    expect(d.requestable).toBe(true)
    expect(d.components[0].options[0]).toMatchObject({
      available: true, pricing: { treatment: 'listed', price: 50, pricing_model: 'flat' }, provider: { type: 'partner', name: 'Cake Co' },
    })
  })
  it('throws when any query fails', async () => {
    const f = fakeSupabase({
      respond: q => {
        if (q.table === 'catalog_items') return { data: null, error: { code: 'XX000' } }
        if (q.table === 'theme_package_components') return { data: comps, error: null }
        if (q.table === 'theme_package_component_options') return { data: opts, error: null }
        return { data: [], error: null }
      },
    })
    const r = (await resolveLivePackage(live().client, 'spooky'))!
    await expect(loadLiveDocument(f.client, r)).rejects.toMatchObject({ code: 'XX000' })
  })
})

describe('checkRequestAbuse', () => {
  const NOW = Date.parse('2026-11-03T12:00:00Z')
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }))
  const abuse = (recent: unknown[], dup: unknown[]) =>
    fakeSupabase({ respond: q => ({ data: 'selected_package_id' in q.eq ? dup : recent, error: null }) })

  it('ok when under the limit and no recent duplicate', async () => {
    expect(await checkRequestAbuse(abuse(rows(9), []).client, { userId: 'u1', versionId: 'v1', now: NOW })).toEqual({ kind: 'ok' })
  })
  it('rate_limited at exactly the daily limit', async () => {
    expect(RATE_LIMIT_PER_DAY).toBe(10)
    expect(await checkRequestAbuse(abuse(rows(10), []).client, { userId: 'u1', versionId: 'v1', now: NOW })).toEqual({ kind: 'rate_limited' })
  })
  it('duplicate returns the earlier request id', async () => {
    expect(await checkRequestAbuse(abuse(rows(2), [{ id: 'r-dup' }]).client, { userId: 'u1', versionId: 'v1', now: NOW })).toEqual({ kind: 'duplicate', requestId: 'r-dup' })
  })
  it('rate limit wins over duplicate (spec order: (a) then (b))', async () => {
    expect(await checkRequestAbuse(abuse(rows(10), [{ id: 'r-dup' }]).client, { userId: 'u1', versionId: 'v1', now: NOW })).toEqual({ kind: 'rate_limited' })
  })
  it('scopes both reads to this user, package requests, the 24h / 2 min windows and the version', async () => {
    const f = abuse([], [])
    await checkRequestAbuse(f.client, { userId: 'u1', versionId: 'v1', now: NOW })
    const recent = f.calls.find(c => !('selected_package_id' in c.eq))!
    const dup = f.calls.find(c => 'selected_package_id' in c.eq)!
    expect(recent.eq).toEqual({ user_id: 'u1', request_source: 'theme_package' })
    expect(recent.gte.created_at).toBe(new Date(NOW - 24 * 3600 * 1000).toISOString())
    expect(dup.eq).toEqual({ user_id: 'u1', request_source: 'theme_package', selected_package_id: 'v1' })
    expect(dup.gte.created_at).toBe(new Date(NOW - 2 * 60 * 1000).toISOString())
  })
  it('throws on a read error (fail closed, no request is created)', async () => {
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000' } }) })
    await expect(checkRequestAbuse(f.client, { userId: 'u1', versionId: 'v1' })).rejects.toMatchObject({ code: 'XX000' })
  })
})

describe('getVerifiedEmail', () => {
  const withUser = (user: unknown, error: unknown = null) => fakeSupabase({ user: () => ({ data: { user }, error }) }).client
  it('returns a confirmed email', async () => {
    expect(await getVerifiedEmail(withUser({ email: 'a@b.com', email_confirmed_at: '2026-01-01' }), 'u1')).toBe('a@b.com')
    expect(await getVerifiedEmail(withUser({ email: 'a@b.com', confirmed_at: '2026-01-01' }), 'u1')).toBe('a@b.com')
  })
  it('null when unconfirmed, missing or no user', async () => {
    expect(await getVerifiedEmail(withUser({ email: 'a@b.com', email_confirmed_at: null }), 'u1')).toBeNull()
    expect(await getVerifiedEmail(withUser({ email: null, email_confirmed_at: '2026-01-01' }), 'u1')).toBeNull()
    expect(await getVerifiedEmail(withUser(null), 'u1')).toBeNull()
  })
  it('throws when the lookup errors', async () => {
    await expect(getVerifiedEmail(withUser(null, { code: 'XX000', message: 'boom' }), 'u1')).rejects.toMatchObject({ code: 'XX000' })
  })
})
