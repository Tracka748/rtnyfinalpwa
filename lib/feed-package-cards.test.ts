import { describe, expect, it } from 'vitest'
import {
  applyLivePackages, isPackageLive, packageHref, toFeedPackageInfo, validateAttachBody,
  type FeedCardRow, type FeedPackageInfo,
} from '@/lib/feed-package-cards'

const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'

const INFO: FeedPackageInfo = {
  key: 'spooky_birthday', occasion: 'Birthday', title: 'Spooky Birthday', subtitle: 'Boo!',
  cover_image_url: 'https://x.com/cover.png', price_note: 'From $500',
}
const row = (over: Partial<FeedCardRow> = {}): FeedCardRow => ({
  id: 'c1', type: 'featured', headline: 'Own headline', sub: 'Own sub', action_label: 'View', cta_url: null,
  event_id: null, promo_code: null, image_url: 'https://x.com/own.png', theme_package_id: null, ...over,
})
const live = (entries: Array<[string, FeedPackageInfo]> = []) => new Map(entries)

describe('applyLivePackages: cards without a package', () => {
  it('are returned byte-for-byte as before (same keys, same order, no extra fields)', () => {
    const today = {
      id: 'c1', type: 'deal', headline: 'H', sub: null, action_label: 'Go', cta_url: '/x', event_id: 'e1', promo_code: 'P', image_url: null,
    }
    const out = applyLivePackages([{ ...today, theme_package_id: null }], live())
    expect(JSON.stringify(out)).toBe(JSON.stringify([today]))
    expect(Object.keys(out[0])).toEqual(Object.keys(today))
  })
  it('are untouched even when the live map has entries, and never get package / href', () => {
    const out = applyLivePackages([row()], live([[U1, INFO]]))
    expect(out[0]).not.toHaveProperty('package')
    expect(out[0]).not.toHaveProperty('href')
    expect(out[0]).not.toHaveProperty('theme_package_id')
    expect(out[0].headline).toBe('Own headline')
  })
  it('an empty list stays empty', () => {
    expect(applyLivePackages([], live([[U1, INFO]]))).toEqual([])
  })
})

describe('applyLivePackages: package cards', () => {
  it('keeps and enriches a live card: package object plus href', () => {
    const out = applyLivePackages([row({ theme_package_id: U1 })], live([[U1, INFO]]))
    expect(out).toHaveLength(1)
    expect(out[0].package).toEqual(INFO)
    expect(out[0].href).toBe('/packages/spooky_birthday')
    expect(out[0]).not.toHaveProperty('theme_package_id')
  })
  it('drops a card whose package is not live (archived, unpublished or gone)', () => {
    expect(applyLivePackages([row({ theme_package_id: U2 })], live([[U1, INFO]]))).toEqual([])
    expect(applyLivePackages([row({ theme_package_id: U1 })], live())).toEqual([])
  })
  it("the card's own non-empty headline, sub and image win over the package's", () => {
    const out = applyLivePackages([row({ theme_package_id: U1 })], live([[U1, INFO]]))
    expect(out[0]).toMatchObject({ headline: 'Own headline', sub: 'Own sub', image_url: 'https://x.com/own.png' })
    expect(out[0].package).toEqual(INFO) // the package object always carries the package's own values
  })
  it.each([null, '', '   '])('falls back to the package value when the card leaves a field empty (%j)', empty => {
    const out = applyLivePackages([row({ theme_package_id: U1, headline: empty ?? '', sub: empty, image_url: empty })], live([[U1, INFO]]))
    expect(out[0]).toMatchObject({ headline: 'Spooky Birthday', sub: 'Boo!', image_url: 'https://x.com/cover.png' })
  })
  it('each field falls back independently', () => {
    const out = applyLivePackages([row({ theme_package_id: U1, sub: null })], live([[U1, INFO]]))
    expect(out[0]).toMatchObject({ headline: 'Own headline', sub: 'Boo!', image_url: 'https://x.com/own.png' })
  })
  it('stays empty (null) when neither the card nor the package has a value', () => {
    const bare: FeedPackageInfo = { ...INFO, subtitle: null, cover_image_url: null }
    const out = applyLivePackages([row({ theme_package_id: U1, sub: null, image_url: '' })], live([[U1, bare]]))
    expect(out[0]).toMatchObject({ sub: null, image_url: null })
  })
  it('does not touch the other card fields', () => {
    const r = row({ theme_package_id: U1, type: 'featured', action_label: 'Book', cta_url: '/c', event_id: 'e9', promo_code: 'PC' })
    const out = applyLivePackages([r], live([[U1, INFO]]))
    expect(out[0]).toMatchObject({ id: 'c1', type: 'featured', action_label: 'Book', cta_url: '/c', event_id: 'e9', promo_code: 'PC' })
  })
  it('the package object has exactly the six public fields', () => {
    const out = applyLivePackages([row({ theme_package_id: U1 })], live([[U1, INFO]]))
    expect(Object.keys(out[0].package!).sort()).toEqual(['cover_image_url', 'key', 'occasion', 'price_note', 'subtitle', 'title'])
  })
  it('preserves order across a mix and drops only the dead package cards', () => {
    const out = applyLivePackages(
      [row({ id: 'a' }), row({ id: 'b', theme_package_id: U2 }), row({ id: 'c', theme_package_id: U1 }), row({ id: 'd' })],
      live([[U1, INFO]])
    )
    expect(out.map(c => c.id)).toEqual(['a', 'c', 'd'])
  })
  it('two cards on the same package are both enriched', () => {
    const out = applyLivePackages([row({ id: 'a', theme_package_id: U1 }), row({ id: 'b', theme_package_id: U1 })], live([[U1, INFO]]))
    expect(out.map(c => c.href)).toEqual(['/packages/spooky_birthday', '/packages/spooky_birthday'])
  })
  it('never fills cta_url from the package link (href is the only link field)', () => {
    const out = applyLivePackages([row({ theme_package_id: U1, cta_url: null })], live([[U1, INFO]]))
    expect(out[0].cta_url).toBeNull()
    expect(out[0].href).toBe('/packages/spooky_birthday')
  })
})

describe('isPackageLive', () => {
  const pkg = { id: 'p1', status: 'active', live_version_id: 'v1' }
  const ver = { id: 'v1', package_id: 'p1', status: 'approved' }
  it('true only for an active package whose live version is its own approved version', () => {
    expect(isPackageLive(pkg, ver)).toBe(true)
  })
  it.each([
    ['archived package', { ...pkg, status: 'archived' }, ver],
    ['no live pointer', { ...pkg, live_version_id: null }, ver],
    ['version not approved', pkg, { ...ver, status: 'superseded' }],
    ['version of another package', pkg, { ...ver, package_id: 'other' }],
    ['pointer to a different version', pkg, { ...ver, id: 'v2' }],
    ['missing version', pkg, null],
    ['missing package', null, ver],
  ])('false for %s', (_name, p, v) => {
    expect(isPackageLive(p as never, v as never)).toBe(false)
  })
})

describe('toFeedPackageInfo / packageHref', () => {
  it('returns exactly the six fields (no guest limits, no theme)', () => {
    const info = toFeedPackageInfo(
      { key: 'k', occasion: 'Birthday' },
      { title: 'T', subtitle: null, cover_image_url: null, price_note: 'n', min_guests: 5, max_guests: 9 }
    )
    expect(info).toEqual({ key: 'k', occasion: 'Birthday', title: 'T', subtitle: null, cover_image_url: null, price_note: 'n' })
  })
  it('builds the href from the key', () => {
    expect(packageHref('spooky_birthday')).toBe('/packages/spooky_birthday')
  })
})

describe('validateAttachBody', () => {
  it('accepts a uuid (lowercased) or null', () => {
    expect(validateAttachBody({ theme_package_id: U1.toUpperCase() })).toEqual({ ok: true, value: { theme_package_id: U1 } })
    expect(validateAttachBody({ theme_package_id: null })).toEqual({ ok: true, value: { theme_package_id: null } })
  })
  it('requires the key', () => {
    expect(validateAttachBody({}).ok).toBe(false)
  })
  it.each(['nope', '', 5, true, undefined, [], {}])('rejects theme_package_id %j', v => {
    expect(validateAttachBody({ theme_package_id: v }).ok).toBe(false)
  })
  it('rejects unknown keys, including user ids and other card columns', () => {
    for (const k of ['user_id', 'created_by', 'updated_by', 'actor', 'headline', 'type', 'active', 'cta_url', 'event_id', 'id']) {
      const r = validateAttachBody({ theme_package_id: U1, [k]: 'x' })
      expect(r.ok).toBe(false)
      expect((r as { error: string }).error).toContain('Unknown field')
    }
  })
  it.each([null, [], 'x', 5, undefined])('rejects non-object body %j', body => {
    expect(validateAttachBody(body).ok).toBe(false)
  })
})
