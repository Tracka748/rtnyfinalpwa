import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapDbError } from '@/lib/catalog-api'
import {
  IN_CHUNK, chunk, findLivePackageUsage, formatLiveUseMessage, type LivePackageUse,
} from '@/lib/catalog-guards'

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

const use = (n: number): LivePackageUse => ({ package_id: `p${n}`, title: `Package ${String(n).padStart(2, '0')}` })

describe('chunk', () => {
  it('splits into pieces of at most the given size', () => {
    const sizes = chunk(Array.from({ length: 450 }, (_, i) => i)).map(c => c.length)
    expect(sizes).toEqual([200, 200, 50])
    expect(IN_CHUNK).toBe(200)
  })
  it('handles empty, exact and custom sizes', () => {
    expect(chunk([])).toEqual([])
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]])
  })
})

describe('formatLiveUseMessage', () => {
  it('names a single package', () => {
    const m = formatLiveUseMessage([{ package_id: 'a', title: 'Spooky Birthday' }], 'item')
    expect(m).toContain('This catalog item is used by 1 live package: "Spooky Birthday".')
    expect(m).toContain('Publish a new version of that package without this item first')
  })
  it('lists up to 5 sorted titles with no "more" suffix', () => {
    const m = formatLiveUseMessage([use(5), use(3), use(1), use(4), use(2)], 'item')
    expect(m).toContain('"Package 01", "Package 02", "Package 03", "Package 04", "Package 05"')
    expect(m).not.toContain('more')
  })
  it('summarises the rest as "and N more"', () => {
    const m = formatLiveUseMessage(Array.from({ length: 8 }, (_, i) => use(i + 1)), 'item')
    expect(m).toContain('used by 8 live packages')
    expect(m).toContain('"Package 05" and 3 more.')
    expect(m).not.toContain('Package 06')
    expect(m).toContain('Publish a new version of each package without this item first')
  })
  it('uses link wording for service links', () => {
    const m = formatLiveUseMessage([use(1)], 'service link')
    expect(m).toContain('This service link is used by')
    expect(m).toContain('without this service first')
  })
})

type Q = {
  table: string
  eq: Record<string, unknown>
  in: { col: string; ids: string[] } | null
  range: [number, number] | null
}
type Result = { data: unknown; error: unknown }

function fakeClient(respond: (q: Q) => Result) {
  const calls: Q[] = []
  const client = {
    from(table: string) {
      const q: Q = { table, eq: {}, in: null, range: null }
      calls.push(q)
      const b: Record<string, unknown> = {
        select: () => b,
        eq: (c: string, v: unknown) => { q.eq[c] = v; return b },
        in: (c: string, ids: string[]) => { q.in = { col: c, ids }; return b },
        order: () => b,
        range: (a: number, z: number) => { q.range = [a, z]; return b },
        then: (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
          new Promise<Result>(resolve => resolve(respond(q))).then(res, rej),
      }
      return b
    },
  }
  return { client: client as never, calls }
}

const ok = (data: unknown): Result => ({ data, error: null })

describe('findLivePackageUsage', () => {
  it('returns no uses and stops early when the item is in no options', async () => {
    const { client, calls } = fakeClient(() => ok([]))
    const r = await findLivePackageUsage(client, { catalogItemId: 'item1' })
    expect(r).toEqual({ ok: true, uses: [] })
    expect(calls.map(c => c.table)).toEqual(['theme_package_component_options'])
  })

  it('follows options -> components -> approved versions and dedupes by package', async () => {
    const { client, calls } = fakeClient(q => {
      if (q.table === 'theme_package_component_options') return ok([{ component_id: 'c1' }, { component_id: 'c2' }, { component_id: 'c1' }])
      if (q.table === 'theme_package_components') return ok([{ version_id: 'v1' }, { version_id: 'v2' }])
      return ok([
        { id: 'v1', package_id: 'pA', title: 'Zebra Party' },
        { id: 'v2', package_id: 'pA', title: 'Zebra Party' },
        { id: 'v3', package_id: 'pB', title: 'Alpha Bash' },
      ])
    })
    const r = await findLivePackageUsage(client, { catalogItemId: 'item1' })
    expect(r).toEqual({
      ok: true,
      uses: [{ package_id: 'pB', title: 'Alpha Bash' }, { package_id: 'pA', title: 'Zebra Party' }],
    })
    const versionsQuery = calls.find(c => c.table === 'theme_package_versions')!
    expect(versionsQuery.eq.status).toBe('approved')
    expect(calls.find(c => c.table === 'theme_package_components')!.in!.ids).toEqual(['c1', 'c2'])
  })

  it('filters by service_id only when checking a link', async () => {
    const seen: Array<Record<string, unknown>> = []
    const { client } = fakeClient(q => {
      if (q.table === 'theme_package_component_options') seen.push(q.eq)
      return ok([])
    })
    await findLivePackageUsage(client, { catalogItemId: 'item1' })
    await findLivePackageUsage(client, { catalogItemId: 'item1', serviceId: 'svc1' })
    expect(seen[0]).toEqual({ catalog_item_id: 'item1' })
    expect(seen[1]).toEqual({ catalog_item_id: 'item1', service_id: 'svc1' })
  })

  it('chunks every .in() list to at most 200 ids', async () => {
    const componentRows = Array.from({ length: 450 }, (_, i) => ({ component_id: `c${i}` }))
    const { client, calls } = fakeClient(q => {
      if (q.table === 'theme_package_component_options') return ok(componentRows)
      if (q.table === 'theme_package_components') {
        return ok(q.in!.ids.map(id => ({ version_id: `v-${id}` })))
      }
      return ok([])
    })
    const r = await findLivePackageUsage(client, { catalogItemId: 'item1' })
    expect(r).toEqual({ ok: true, uses: [] })
    const compCalls = calls.filter(c => c.table === 'theme_package_components')
    const verCalls = calls.filter(c => c.table === 'theme_package_versions')
    expect(compCalls.map(c => c.in!.ids.length)).toEqual([200, 200, 50])
    expect(verCalls.map(c => c.in!.ids.length)).toEqual([200, 200, 50])
    expect(Math.max(...[...compCalls, ...verCalls].map(c => c.in!.ids.length))).toBeLessThanOrEqual(200)
  })

  describe('fails closed', () => {
    const dbError = { code: '42501', message: 'permission denied for table theme_package_components' }

    for (const failing of ['theme_package_component_options', 'theme_package_components', 'theme_package_versions']) {
      it(`when the ${failing} query errors`, async () => {
        const { client } = fakeClient(q => {
          if (q.table === failing) return { data: null, error: dbError }
          if (q.table === 'theme_package_component_options') return ok([{ component_id: 'c1' }])
          if (q.table === 'theme_package_components') return ok([{ version_id: 'v1' }])
          return ok([{ id: 'v1', package_id: 'p1', title: 'T' }])
        })
        const r = await findLivePackageUsage(client, { catalogItemId: 'item1' })
        expect(r.ok).toBe(false)
        if (!r.ok) {
          // The real code/message are kept for the log, but mapDbError must answer a generic 500
          // (not the 403 that 42501 would map to), so the caller does not perform the change.
          expect(r.error.message).toContain('42501')
          const res = mapDbError(r.error, 'test')
          expect(res.status).toBe(500)
          expect(await res.json()).toEqual({ success: false, error: 'Something went wrong' })
        }
      })
    }

    it('when a query throws', async () => {
      const { client } = fakeClient(() => { throw new Error('network down') })
      const r = await findLivePackageUsage(client, { catalogItemId: 'item1' })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(mapDbError(r.error, 'test').status).toBe(500)
    })
  })
})
