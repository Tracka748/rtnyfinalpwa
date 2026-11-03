import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: h.createSupabaseAdmin }))

import { fakeSupabase } from '@/lib/test-support/fake-supabase'
import { GET } from './route'

const PKG_LIVE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const PKG_ARCHIVED = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const VER = '11111111-1111-1111-1111-111111111111'
const ORIGINAL_COLUMNS = 'id, type, headline, sub, action_label, cta_url, event_id, promo_code, image_url'

const card = (over: Record<string, unknown> = {}) => ({
  id: 'c1', type: 'announcement', headline: 'H', sub: 'S', action_label: 'Go', cta_url: '/x', event_id: null, promo_code: null,
  image_url: null, theme_package_id: null, ...over,
})
const withoutPackageColumn = ({ theme_package_id: _t, ...rest }: Record<string, unknown>) => rest

const PACKAGES = [
  { id: PKG_LIVE, key: 'spooky_birthday', occasion: 'Birthday', status: 'active', live_version_id: VER },
  { id: PKG_ARCHIVED, key: 'old_one', occasion: 'Birthday', status: 'archived', live_version_id: VER },
]
const VERSIONS = [{
  id: VER, package_id: PKG_LIVE, status: 'approved', title: 'Spooky Birthday', subtitle: 'Boo!',
  cover_image_url: 'https://x.com/cover.png', price_note: 'From $500', min_guests: 5, max_guests: 30,
}]

interface Seen { select?: string; eq: Record<string, unknown>; order?: [string, unknown]; limit?: number }

// The feed_cards query chains .eq/.or/.order/.limit, which the shared fake does not model,
// so it gets a small local stub; every other table goes through the shared fake.
function feedTable(result: { data: unknown; error: unknown }, seen: Seen) {
  const b: Record<string, unknown> = {
    select: (c: string) => { seen.select = c; return b },
    eq: (c: string, v: unknown) => { seen.eq[c] = v; return b },
    or: () => b,
    order: (c: string, o: unknown) => { seen.order = [c, o]; return b },
    limit: (n: number) => { seen.limit = n; return b },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return b
}

function setup(o: { cards?: unknown[]; feedError?: unknown; packageError?: unknown } = {}) {
  const base = fakeSupabase({
    respond: q => {
      if (o.packageError) return { data: null, error: o.packageError }
      if (q.table === 'theme_packages') return { data: PACKAGES, error: null }
      if (q.table === 'theme_package_versions') return { data: VERSIONS, error: null }
      return { data: null, error: null }
    },
  })
  const seen: Seen = { eq: {} }
  const result = o.feedError ? { data: null, error: o.feedError } : { data: o.cards ?? [], error: null }
  const baseClient = base.client as { from: (t: string) => unknown }
  h.createSupabaseAdmin.mockReturnValue({ from: (t: string) => (t === 'feed_cards' ? feedTable(result, seen) : baseClient.from(t)) })
  return { base, seen }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/v1/feed-cards: cards without a package behave exactly as before', () => {
  it('returns the same JSON, byte for byte, and does no package queries', async () => {
    const cards = [card({ id: 'a', type: 'deal', promo_code: 'P' }), card({ id: 'b', type: 'curated', event_id: 'e1', cta_url: null })]
    const { base } = setup({ cards })
    const res = await GET()
    expect(res.status).toBe(200)
    expect(JSON.stringify(await res.json())).toBe(JSON.stringify(cards.map(withoutPackageColumn)))
    expect(base.calls).toHaveLength(0)
  })
  it('keeps the original query: same leading columns, active only, display_order ascending, limit 8', async () => {
    const { seen } = setup()
    await GET()
    expect(seen.select?.startsWith(ORIGINAL_COLUMNS)).toBe(true)
    expect(seen.eq).toEqual({ active: true })
    expect(seen.order).toEqual(['display_order', { ascending: true }])
    expect(seen.limit).toBe(8)
  })
  it('an empty feed is an empty array; a failed query keeps the old error response', async () => {
    setup({ cards: [] })
    expect(await (await GET()).json()).toEqual([])
    setup({ feedError: { code: 'XX000', message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to fetch feed cards' })
  })
  it('never exposes theme_package_id', async () => {
    setup({ cards: [card({ theme_package_id: PKG_LIVE }), card({ id: 'z' })] })
    expect(JSON.stringify(await (await GET()).json())).not.toContain('theme_package_id')
  })
})

describe('GET /api/v1/feed-cards: package cards', () => {
  it('keeps and enriches live ones, drops archived ones, leaves the rest untouched, in order', async () => {
    const plain = card({ id: 'plain' })
    const { base } = setup({
      cards: [plain, card({ id: 'live', type: 'featured', headline: '', sub: null, image_url: null, cta_url: null, theme_package_id: PKG_LIVE }), card({ id: 'dead', theme_package_id: PKG_ARCHIVED }), card({ id: 'last' })],
    })
    const out = await (await GET()).json()
    expect(out.map((c: { id: string }) => c.id)).toEqual(['plain', 'live', 'last'])
    expect(out[0]).toEqual(withoutPackageColumn(plain))
    expect(out[1]).toMatchObject({
      headline: 'Spooky Birthday', sub: 'Boo!', image_url: 'https://x.com/cover.png', href: '/packages/spooky_birthday', cta_url: null,
      package: { key: 'spooky_birthday', occasion: 'Birthday', title: 'Spooky Birthday', subtitle: 'Boo!', cover_image_url: 'https://x.com/cover.png', price_note: 'From $500' },
    })
    expect(base.calls.map(c => c.table)).toEqual(['theme_packages', 'theme_package_versions'])
  })
  it("a card's own title, subtitle and image win over the package's", async () => {
    setup({ cards: [card({ id: 'p', headline: 'Mine', sub: 'My sub', image_url: 'https://x.com/mine.png', theme_package_id: PKG_LIVE })] })
    const [c] = await (await GET()).json()
    expect(c).toMatchObject({ headline: 'Mine', sub: 'My sub', image_url: 'https://x.com/mine.png', href: '/packages/spooky_birthday' })
  })
  it('looks all packages up in one pair of queries, however many package cards there are', async () => {
    const { base } = setup({ cards: [1, 2, 3, 4].map(i => card({ id: `c${i}`, theme_package_id: PKG_LIVE })) })
    const out = await (await GET()).json()
    expect(out).toHaveLength(4)
    expect(base.calls).toHaveLength(2)
  })
  it('a failed package lookup drops the package cards but still returns every other card (200)', async () => {
    setup({ cards: [card({ id: 'plain' }), card({ id: 'pkg', theme_package_id: PKG_LIVE })], packageError: { code: 'XX000', message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).map((c: { id: string }) => c.id)).toEqual(['plain'])
    expect(console.error).toHaveBeenCalled()
  })
  it('archiving drops the card immediately: the card is gone once the package is not live', async () => {
    setup({ cards: [card({ id: 'dead', theme_package_id: PKG_ARCHIVED })] })
    expect(await (await GET()).json()).toEqual([])
  })
})
