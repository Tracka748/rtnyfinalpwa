import { describe, expect, it } from 'vitest'
import { isPackageFeaturable, loadLivePackagesByIds } from '@/lib/feed-package-cards-api'
import { resolveLivePackage } from '@/lib/theme-package-public-api'
import { fakeSupabase, type Recorded } from '@/lib/test-support/fake-supabase'

const PKG = { id: 'p1', key: 'spooky', occasion: 'Birthday', status: 'active', theme_id: null, live_version_id: 'v1' }
const VER = {
  id: 'v1', package_id: 'p1', status: 'approved', title: 'Spooky', subtitle: 'Boo', cover_image_url: 'https://x.com/c.png',
  magazine_url: null, description: null, price_note: 'From $500', min_guests: 5, max_guests: 30, published_at: null,
}

// A fake that honours .eq() filters like the database does, so both loaders see the same world.
type Tables = Record<string, Array<Record<string, unknown>>>
function db(tables: Tables, single: boolean) {
  return fakeSupabase({
    respond: (q: Recorded) => {
      const rows = (tables[q.table] ?? []).filter(r => Object.entries(q.eq).every(([k, v]) => r[k] === v))
      return { data: single ? rows[0] ?? null : rows, error: null }
    },
  })
}

describe('loadLivePackagesByIds', () => {
  it('returns the live package keyed by id with the six feed fields', async () => {
    const f = db({ theme_packages: [PKG], theme_package_versions: [VER] }, false)
    const m = await loadLivePackagesByIds(f.client, ['p1'])
    expect(m.get('p1')).toEqual({ key: 'spooky', occasion: 'Birthday', title: 'Spooky', subtitle: 'Boo', cover_image_url: 'https://x.com/c.png', price_note: 'From $500' })
  })
  it('does one packages query and one versions query for many cards, not one per card', async () => {
    const f = db({ theme_packages: [PKG], theme_package_versions: [VER] }, false)
    await loadLivePackagesByIds(f.client, ['p1', 'p1', 'p2', 'p3', 'p1'])
    expect(f.calls.map(c => c.table)).toEqual(['theme_packages', 'theme_package_versions'])
    expect(f.calls[0].in.id).toEqual(['p1', 'p2', 'p3']) // de-duplicated
  })
  it('filters to active packages and approved versions in the query', async () => {
    const f = db({ theme_packages: [PKG], theme_package_versions: [VER] }, false)
    await loadLivePackagesByIds(f.client, ['p1'])
    expect(f.calls[0].eq).toEqual({ status: 'active' })
    expect(f.calls[1].eq).toEqual({ status: 'approved' })
  })
  it('chunks id lists to at most 200 per query', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`)
    const f = db({ theme_packages: [], theme_package_versions: [] }, false)
    await loadLivePackagesByIds(f.client, ids)
    expect(f.calls.map(c => c.in.id.length)).toEqual([200, 200, 50])
  })
  it('an empty input does no queries', async () => {
    const f = db({}, false)
    expect((await loadLivePackagesByIds(f.client, [])).size).toBe(0)
    expect(f.calls).toHaveLength(0)
  })
  it('throws on a database error (the feed route catches it and drops package cards)', async () => {
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000', message: 'boom' } }) })
    await expect(loadLivePackagesByIds(f.client, ['p1'])).rejects.toMatchObject({ code: 'XX000' })
    const g = fakeSupabase({ respond: q => (q.table === 'theme_packages' ? { data: [PKG], error: null } : { data: null, error: { code: 'XX000' } }) })
    await expect(loadLivePackagesByIds(g.client, ['p1'])).rejects.toMatchObject({ code: 'XX000' })
  })
})

describe('feed liveness agrees with the public package routes (resolveLivePackage)', () => {
  const scenarios: Array<[string, Tables]> = [
    ['active, approved live version', { theme_packages: [PKG], theme_package_versions: [VER] }],
    ['archived package', { theme_packages: [{ ...PKG, status: 'archived' }], theme_package_versions: [VER] }],
    ['no live pointer', { theme_packages: [{ ...PKG, live_version_id: null }], theme_package_versions: [VER] }],
    ['live version superseded', { theme_packages: [PKG], theme_package_versions: [{ ...VER, status: 'superseded' }] }],
    ['live version belongs to another package', { theme_packages: [PKG], theme_package_versions: [{ ...VER, package_id: 'other' }] }],
    ['live version missing', { theme_packages: [PKG], theme_package_versions: [] }],
    ['package gone', { theme_packages: [], theme_package_versions: [VER] }],
  ]
  it.each(scenarios)('%s', async (_name, tables) => {
    const viaRoutes = (await resolveLivePackage(db(tables, true).client, 'spooky')) !== null
    const viaFeed = (await loadLivePackagesByIds(db(tables, false).client, ['p1'])).has('p1')
    expect(viaFeed).toBe(viaRoutes)
  })
  it('the live scenario really is live (so the table above is not vacuous)', async () => {
    expect((await loadLivePackagesByIds(db({ theme_packages: [PKG], theme_package_versions: [VER] }, false).client, ['p1'])).has('p1')).toBe(true)
  })
})

describe('isPackageFeaturable (the trigger rule)', () => {
  const featurable = (row: unknown) =>
    isPackageFeaturable(fakeSupabase({ respond: () => ({ data: row, error: null }) }).client, 'p1')
  it('true for an active package with a live version', async () => {
    expect(await featurable({ id: 'p1', status: 'active', live_version_id: 'v1' })).toBe(true)
  })
  it('false for archived, unpublished or missing packages', async () => {
    expect(await featurable({ id: 'p1', status: 'archived', live_version_id: 'v1' })).toBe(false)
    expect(await featurable({ id: 'p1', status: 'active', live_version_id: null })).toBe(false)
    expect(await featurable(null)).toBe(false)
  })
  it('throws on a database error', async () => {
    const f = fakeSupabase({ respond: () => ({ data: null, error: { code: 'XX000' } }) })
    await expect(isPackageFeaturable(f.client, 'p1')).rejects.toMatchObject({ code: 'XX000' })
  })
})
