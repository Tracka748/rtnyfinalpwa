import { describe, expect, it } from 'vitest'
import {
  escapeLike, isUuid, validateCreateItem, validateCreateLink, validateEligibleQuery,
  validateItemListQuery, validateThemeIds, validateUpdateItem, validateUpdateLink,
} from '@/lib/catalog-validation'

const UUID = '11111111-1111-1111-1111-111111111111'
const base = { key: 'balloon_arch', name: 'Balloon arch', item_type: 'decoration' }
const err = (r: { ok: boolean }) => (r as { ok: false; error: string }).error

describe('validateCreateItem', () => {
  it('accepts a minimal body and applies defaults', () => {
    const r = validateCreateItem(base)
    expect(r).toEqual({ ok: true, value: { ...base, description: null, occasions: [], image_url: null, status: 'draft' } })
  })

  it.each(['Balloon', '1abc', 'a-b', 'a b', '', '_a', 'a'.repeat(65)])('rejects invalid slug %j', key => {
    expect(validateCreateItem({ ...base, key }).ok).toBe(false)
  })
  it.each(['a', 'a1_b2', 'balloon_arch'])('accepts valid slug %j', key => {
    expect(validateCreateItem({ ...base, key }).ok).toBe(true)
  })
  it('rejects a non-string key', () => {
    expect(validateCreateItem({ ...base, key: 5 }).ok).toBe(false)
  })

  it('validates item_type and status enums (archived is not allowed on create)', () => {
    expect(validateCreateItem({ ...base, item_type: 'car' }).ok).toBe(false)
    expect(validateCreateItem({ ...base, status: 'archived' }).ok).toBe(false)
    expect(validateCreateItem({ ...base, status: 'active' }).ok).toBe(true)
  })

  it('enforces length limits', () => {
    expect(validateCreateItem({ ...base, name: 'x'.repeat(120) }).ok).toBe(true)
    expect(validateCreateItem({ ...base, name: 'x'.repeat(121) }).ok).toBe(false)
    expect(validateCreateItem({ ...base, name: '   ' }).ok).toBe(false)
    expect(validateCreateItem({ ...base, description: 'x'.repeat(2000) }).ok).toBe(true)
    expect(validateCreateItem({ ...base, description: 'x'.repeat(2001) }).ok).toBe(false)
    expect(validateCreateItem({ ...base, occasions: Array.from({ length: 20 }, (_, i) => `o${i}`) }).ok).toBe(true)
    expect(validateCreateItem({ ...base, occasions: Array.from({ length: 21 }, (_, i) => `o${i}`) }).ok).toBe(false)
    expect(validateCreateItem({ ...base, occasions: ['x'.repeat(40)] }).ok).toBe(true)
    expect(validateCreateItem({ ...base, occasions: ['x'.repeat(41)] }).ok).toBe(false)
    expect(validateCreateItem({ ...base, occasions: [1] }).ok).toBe(false)
  })

  it('rejects unknown keys, including server-owned ones', () => {
    for (const extra of ['created_by', 'approved_by', 'role', 'id', '__proto__']) {
      const body: Record<string, unknown> = { ...base }
      Object.defineProperty(body, extra, { value: 'x', enumerable: true, configurable: true, writable: true })
      const r = validateCreateItem(body)
      expect(r.ok).toBe(false)
      expect(err(r)).toContain('Unknown field')
    }
  })

  it.each([null, [], 'str', 5, undefined])('rejects non-object body %j', body => {
    expect(validateCreateItem(body).ok).toBe(false)
  })

  it('allows https image urls only', () => {
    expect(validateCreateItem({ ...base, image_url: 'https://cdn.example.com/a.png' }).ok).toBe(true)
    expect(validateCreateItem({ ...base, image_url: null }).ok).toBe(true)
    for (const url of ['http://example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AA', 'ftp://x.com/a', '//x.com/a', 'not a url', 'https://user:pw@x.com/a']) {
      expect(validateCreateItem({ ...base, image_url: url }).ok).toBe(false)
    }
    expect(validateCreateItem({ ...base, image_url: 'https://x.com/' + 'a'.repeat(2048) }).ok).toBe(false)
  })
})

describe('validateUpdateItem', () => {
  it('rejects key changes with a specific message', () => {
    const r = validateUpdateItem({ key: 'other' })
    expect(r.ok).toBe(false)
    expect(err(r)).toBe('key cannot be changed')
  })
  it('rejects empty and unknown-field updates', () => {
    expect(validateUpdateItem({}).ok).toBe(false)
    expect(validateUpdateItem({ approved_by: UUID }).ok).toBe(false)
    expect(validateUpdateItem({ created_by: UUID }).ok).toBe(false)
  })
  it('accepts archived and partial patches, normalising blank description to null', () => {
    expect(validateUpdateItem({ status: 'archived' })).toEqual({ ok: true, value: { status: 'archived' } })
    expect(validateUpdateItem({ description: '  ' })).toEqual({ ok: true, value: { description: null } })
    expect(validateUpdateItem({ status: 'deleted' }).ok).toBe(false)
  })
})

describe('validateThemeIds', () => {
  it('accepts an empty set, dedupes and lowercases', () => {
    expect(validateThemeIds({ theme_ids: [] })).toEqual({ ok: true, value: { theme_ids: [] } })
    expect(validateThemeIds({ theme_ids: [UUID.toUpperCase(), UUID] })).toEqual({ ok: true, value: { theme_ids: [UUID] } })
  })
  it('rejects bad shapes', () => {
    expect(validateThemeIds({}).ok).toBe(false)
    expect(validateThemeIds({ theme_ids: ['nope'] }).ok).toBe(false)
    expect(validateThemeIds({ theme_ids: [UUID], extra: 1 }).ok).toBe(false)
    const many = Array.from({ length: 51 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`)
    expect(validateThemeIds({ theme_ids: many }).ok).toBe(false)
  })
})

describe('validateCreateLink / validateUpdateLink', () => {
  it('requires price_treatment with no default', () => {
    expect(validateCreateLink({ service_id: UUID }).ok).toBe(false)
    expect(validateCreateLink({ service_id: UUID, price_treatment: 'cheap' }).ok).toBe(false)
    expect(validateCreateLink({ service_id: 'x', price_treatment: 'free' }).ok).toBe(false)
    expect(validateCreateLink({ service_id: UUID, price_treatment: 'listed' })).toEqual({
      ok: true, value: { service_id: UUID, price_treatment: 'listed' },
    })
  })
  it('rejects approver or status smuggled into create', () => {
    expect(validateCreateLink({ service_id: UUID, price_treatment: 'quote', approved_by: UUID }).ok).toBe(false)
    expect(validateCreateLink({ service_id: UUID, price_treatment: 'quote', status: 'approved' }).ok).toBe(false)
  })
  it('never allows repointing a link', () => {
    expect(validateUpdateLink({ catalog_item_id: UUID }).ok).toBe(false)
    expect(validateUpdateLink({ service_id: UUID }).ok).toBe(false)
  })
  it('validates update fields', () => {
    expect(validateUpdateLink({}).ok).toBe(false)
    expect(validateUpdateLink({ status: 'pending' }).ok).toBe(false)
    expect(validateUpdateLink({ status: 'rejected', price_treatment: 'free' })).toEqual({
      ok: true, value: { status: 'rejected', price_treatment: 'free' },
    })
  })
})

describe('validateItemListQuery', () => {
  it('validates filters and defaults offset to 0', () => {
    expect(validateItemListQuery(new URLSearchParams('status=active&item_type=food'))).toEqual({
      ok: true, value: { status: 'active', item_type: 'food', offset: 0 },
    })
    expect(validateItemListQuery(new URLSearchParams(''))).toEqual({ ok: true, value: { offset: 0 } })
    expect(validateItemListQuery(new URLSearchParams('status=bogus')).ok).toBe(false)
    expect(validateItemListQuery(new URLSearchParams('item_type=car')).ok).toBe(false)
  })
  it('accepts offset 0 to 10000 and an empty value', () => {
    for (const [qs, want] of [['offset=0', 0], ['offset=20', 20], ['offset=10000', 10000], ['offset=', 0]] as const) {
      expect(validateItemListQuery(new URLSearchParams(qs))).toEqual({ ok: true, value: { offset: want } })
    }
  })
  it('rejects bad offsets', () => {
    for (const qs of ['offset=-1', 'offset=1.5', 'offset=abc', 'offset=10001', 'offset=1e3', 'offset=%2B5', `offset=${'9'.repeat(30)}`]) {
      expect(validateItemListQuery(new URLSearchParams(qs)).ok).toBe(false)
    }
  })
})

describe('validateEligibleQuery', () => {
  it('validates q and limit', () => {
    expect(validateEligibleQuery(new URLSearchParams(''))).toEqual({ ok: true, value: { q: null, limit: 50 } })
    expect(validateEligibleQuery(new URLSearchParams('q=%20cake%20&limit=10'))).toEqual({ ok: true, value: { q: 'cake', limit: 10 } })
    for (const qs of ['limit=0', 'limit=101', 'limit=abc', 'limit=1.5', `q=${'x'.repeat(81)}`]) {
      expect(validateEligibleQuery(new URLSearchParams(qs)).ok).toBe(false)
    }
  })
})

describe('helpers', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
  })
  it('isUuid', () => {
    expect(isUuid(UUID)).toBe(true)
    expect(isUuid('nope')).toBe(false)
    expect(isUuid(5)).toBe(false)
  })
})
