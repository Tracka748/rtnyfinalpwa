import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUDGET_RANGES, isSlugKey, todayUtc, validateCreateRequestBody, validateLiveListQuery, validateOffsetQuery,
  validatePreviewBody, validateSelection,
} from '@/lib/theme-package-public-validation'

const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const TODAY = '2026-11-03'
const err = (r: { ok: boolean }) => (r as { ok: false; error: string }).error
const base = { version_id: U1, event_date: '2026-12-25', guest_count: 20, budget_range: '$500–$1,000' }
const create = (extra: Record<string, unknown> = {}) => validateCreateRequestBody({ ...base, ...extra }, TODAY)

describe('budget values', () => {
  it('match the Plan My Event form exactly (drift guard)', () => {
    const src = readFileSync(join(process.cwd(), 'components/custom/plan/EventDetailsForm.tsx'), 'utf8')
    expect(src.length).toBeGreaterThan(1000) // really read the component file
    expect(BUDGET_RANGES).toHaveLength(5)
    for (const b of BUDGET_RANGES) expect(src).toContain(`'${b}'`)
  })
})

describe('isSlugKey / todayUtc', () => {
  it('accepts slugs and rejects everything else', () => {
    for (const k of ['spooky_birthday', 'a', 'a1_b2']) expect(isSlugKey(k)).toBe(true)
    for (const k of ['Spooky', '1abc', 'a-b', '', '_a', 'a'.repeat(65), 5, null, undefined, '../etc']) expect(isSlugKey(k)).toBe(false)
    expect(isSlugKey('a'.repeat(64))).toBe(true)
  })
  it('formats the UTC date', () => {
    expect(todayUtc(new Date('2026-11-03T23:59:59Z'))).toBe('2026-11-03')
  })
})

describe('validateSelection', () => {
  it('defaults to no components and normalises entries', () => {
    expect(validateSelection({})).toEqual({ ok: true, value: { components: [] } })
    expect(validateSelection({ components: [{ component_id: U1.toUpperCase(), included: false, option_id: U2.toUpperCase() }] })).toEqual({
      ok: true, value: { components: [{ component_id: U1, included: false, option_id: U2 }] },
    })
    expect(validateSelection({ components: [{ component_id: U1 }] })).toEqual({ ok: true, value: { components: [{ component_id: U1 }] } })
  })
  it('allows at most 30 entries', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ component_id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}` }))
    expect(validateSelection({ components: many(30) }).ok).toBe(true)
    expect(validateSelection({ components: many(31) }).ok).toBe(false)
  })
  it('rejects duplicate component ids (case-insensitively)', () => {
    const r = validateSelection({ components: [{ component_id: U1 }, { component_id: U1.toUpperCase() }] })
    expect(r.ok).toBe(false)
    expect(err(r)).toContain('duplicate')
  })
  it('rejects unknown keys, at the top level and per entry', () => {
    expect(validateSelection({ components: [], price: 1 }).ok).toBe(false)
    for (const k of ['price', 'service_id', 'partner_id', 'catalog_item_id', 'quantity']) {
      expect(validateSelection({ components: [{ component_id: U1, [k]: U2 }] }).ok).toBe(false)
    }
  })
  it('rejects bad shapes and types', () => {
    for (const s of [null, [], 'x', 5]) expect(validateSelection(s).ok).toBe(false)
    expect(validateSelection({ components: 'x' }).ok).toBe(false)
    expect(validateSelection({ components: [null] }).ok).toBe(false)
    expect(validateSelection({ components: [{}] }).ok).toBe(false)
    expect(validateSelection({ components: [{ component_id: 'nope' }] }).ok).toBe(false)
    expect(validateSelection({ components: [{ component_id: U1, included: 'yes' }] }).ok).toBe(false)
    expect(validateSelection({ components: [{ component_id: U1, option_id: 'nope' }] }).ok).toBe(false)
    expect(validateSelection({ components: [{ component_id: U1, option_id: null }] }).ok).toBe(false)
  })
})

describe('validatePreviewBody', () => {
  it('everything is optional', () => {
    expect(validatePreviewBody({})).toEqual({ ok: true, value: { selection: { components: [] }, guest_count: null, event_date: null } })
    expect(validatePreviewBody({ guest_count: null, event_date: null }).ok).toBe(true)
    expect(validatePreviewBody({ guest_count: 25, event_date: '2027-01-15' })).toEqual({
      ok: true, value: { selection: { components: [] }, guest_count: 25, event_date: '2027-01-15' },
    })
  })
  it('validates guest_count and event_date when present', () => {
    for (const g of [0, 10001, 1.5, '5', NaN, -1]) expect(validatePreviewBody({ guest_count: g }).ok).toBe(false)
    for (const d of ['2027-02-30', '2027-13-01', '27-01-01', 'tomorrow', 20270101, '2027-1-1']) expect(validatePreviewBody({ event_date: d }).ok).toBe(false)
  })
  it('rejects unknown keys, including prices and ids', () => {
    for (const k of ['price', 'service_id', 'partner_id', 'vendor_id', 'snapshot', 'user_id', 'version_id']) {
      expect(validatePreviewBody({ [k]: 'x' }).ok).toBe(false)
    }
  })
  it.each([null, [], 'x', 5, undefined])('rejects non-object body %j', body => {
    expect(validatePreviewBody(body).ok).toBe(false)
  })
})

describe('validateCreateRequestBody', () => {
  it('accepts a full body and normalises it', () => {
    expect(create({ notes: '  hello  ', version_id: U1.toUpperCase() })).toEqual({
      ok: true,
      value: { version_id: U1, selection: { components: [] }, event_date: '2026-12-25', guest_count: 20, budget_range: '$500–$1,000', event_type: null, notes: 'hello' },
    })
  })
  it('requires version_id, event_date and guest_count (budget_range is optional)', () => {
    for (const k of ['version_id', 'event_date', 'guest_count']) {
      const body: Record<string, unknown> = { ...base }
      delete body[k]
      expect(validateCreateRequestBody(body, TODAY).ok).toBe(false)
    }
    expect(create({ version_id: 'nope' }).ok).toBe(false)
  })
  it('event_date must be a real date and not in the past (today is allowed)', () => {
    expect(create({ event_date: TODAY }).ok).toBe(true)
    expect(create({ event_date: '2026-11-04' }).ok).toBe(true)
    const past = create({ event_date: '2026-11-02' })
    expect(past.ok).toBe(false)
    expect(err(past)).toContain('past')
    for (const d of ['2026-02-30', '2026-13-01', '2026-00-10', '2025-02-29', 'next week', 20261225, null, '']) {
      expect(create({ event_date: d }).ok).toBe(false)
    }
    expect(create({ event_date: '2028-02-29' }).ok).toBe(true) // leap day
  })
  it('guest_count is an integer from 1 to 10000', () => {
    for (const g of [1, 10000]) expect(create({ guest_count: g }).ok).toBe(true)
    for (const g of [0, 10001, 1.5, '20', null, NaN, -3]) expect(create({ guest_count: g }).ok).toBe(false)
  })
  it('budget_range, when given, must be one of the Plan My Event values (exact match)', () => {
    for (const b of BUDGET_RANGES) expect(create({ budget_range: b }).ok).toBe(true)
    for (const b of ['$500-$1,000', 'cheap', 500, true, [], {}, 'under $500', '$50–$100', ' Under $500 ']) expect(create({ budget_range: b }).ok).toBe(false)
  })
  it('notes: blank -> null, at most 2000, string only', () => {
    expect(create({ notes: '   ' })).toMatchObject({ ok: true, value: { notes: null } })
    expect(create({ notes: null })).toMatchObject({ ok: true, value: { notes: null } })
    expect(create({ notes: 'x'.repeat(2000) }).ok).toBe(true)
    expect(create({ notes: 'x'.repeat(2001) }).ok).toBe(false)
    expect(create({ notes: 5 }).ok).toBe(false)
  })
  it('rejects user, email, price, vendor, service and snapshot keys', () => {
    for (const k of ['user_id', 'p_user_id', 'email', 'contact_email', 'price', 'listed_price', 'line_total', 'service_id', 'partner_id', 'vendor_id', 'snapshot', 'package_snapshot', 'status', 'event_subtype', 'eventType', 'occasion', 'package_id', 'package_key']) {
      const r = create({ [k]: 'x' })
      expect(r.ok).toBe(false)
      expect(err(r)).toContain('Unknown field')
    }
  })
  it('validates the nested selection', () => {
    expect(create({ selection: { components: [{ component_id: U2, included: false }] } }).ok).toBe(true)
    expect(create({ selection: { components: [{ component_id: U2 }, { component_id: U2 }] } }).ok).toBe(false)
    expect(create({ selection: 'x' }).ok).toBe(false)
  })
  it.each([null, [], 'x', 5, undefined])('rejects non-object body %j', body => {
    expect(validateCreateRequestBody(body, TODAY).ok).toBe(false)
  })
})

describe('validateCreateRequestBody: optional budget_range', () => {
  it('is accepted when absent, null, empty or blank, and stored as null', () => {
    const body: Record<string, unknown> = { ...base }
    delete body.budget_range
    expect(validateCreateRequestBody(body, TODAY)).toMatchObject({ ok: true, value: { budget_range: null } })
    for (const b of [null, '', '   ']) expect(create({ budget_range: b })).toMatchObject({ ok: true, value: { budget_range: null } })
  })
  it('an invalid value is still rejected with the allowed list in the message', () => {
    const r = create({ budget_range: 'cheap' })
    expect(r.ok).toBe(false)
    expect(err(r)).toContain('Under $500')
  })
})

describe('validateCreateRequestBody: optional event_type', () => {
  const et = (v: unknown) => create({ event_type: v })
  it('absent, null, empty or blank -> null (the package occasion is kept)', () => {
    expect(create()).toMatchObject({ ok: true, value: { event_type: null } })
    for (const v of [null, '', '   ']) expect(et(v)).toMatchObject({ ok: true, value: { event_type: null } })
  })
  it('a custom value is trimmed and kept', () => {
    expect(et('  Baby shower  ')).toMatchObject({ ok: true, value: { event_type: 'Baby shower' } })
    expect(et("Zoë's 30th — fête 🎉")).toMatchObject({ ok: true, value: { event_type: "Zoë's 30th — fête 🎉" } })
  })
  it('allows up to 80 characters (counted as characters, not UTF-16 units) and rejects 81', () => {
    expect(et('x'.repeat(80)).ok).toBe(true)
    expect(et('😀'.repeat(80)).ok).toBe(true)
    const r = et('x'.repeat(81))
    expect(r.ok).toBe(false)
    expect(err(r)).toContain('at most 80')
    expect(et('😀'.repeat(81)).ok).toBe(false)
  })
  it('rejects control characters anywhere, including leading/trailing ones that trim would hide', () => {
    for (const v of ['a\u0000b', 'a\nb', 'a\tb', 'a\u007Fb', 'a\u0085b', 'a\u001Fb', '\nParty', 'Party\r\n', '  \n  ']) {
      const r = et(v)
      expect(r.ok).toBe(false)
      expect(err(r)).toContain('control characters')
    }
  })
  it('rejects non-strings', () => {
    for (const v of [5, true, [], {}]) expect(et(v).ok).toBe(false)
  })
  it('does not change any other field', () => {
    const a = create()
    const b = et('Baby shower')
    expect(a.ok && b.ok && { ...a.value, event_type: null }).toEqual(b.ok && { ...b.value, event_type: null })
  })
  it('stays out of the way of unknown-key rejection', () => {
    for (const k of ['eventType', 'event_subtype', 'occasion', 'package_id', 'package_key', 'snapshot', 'user_id', 'email']) {
      expect(create({ [k]: 'x' }).ok).toBe(false)
    }
  })
})

describe('query validators', () => {
  it('live list: occasion, theme_id and offset', () => {
    expect(validateLiveListQuery(new URLSearchParams(''))).toEqual({ ok: true, value: { offset: 0 } })
    expect(validateLiveListQuery(new URLSearchParams(`occasion=%20Birthday%20&theme_id=${U1.toUpperCase()}&offset=50`))).toEqual({
      ok: true, value: { occasion: 'Birthday', theme_id: U1, offset: 50 },
    })
    for (const qs of ['theme_id=nope', `occasion=${'x'.repeat(61)}`, 'offset=-1', 'offset=1.5', 'offset=10001', 'offset=abc']) {
      expect(validateLiveListQuery(new URLSearchParams(qs)).ok).toBe(false)
    }
    expect(validateLiveListQuery(new URLSearchParams('offset=10000')).ok).toBe(true)
  })
  it('offset-only query', () => {
    expect(validateOffsetQuery(new URLSearchParams('offset=100'))).toEqual({ ok: true, value: { offset: 100 } })
    expect(validateOffsetQuery(new URLSearchParams('')).ok).toBe(true)
    expect(validateOffsetQuery(new URLSearchParams('offset=-5')).ok).toBe(false)
  })
})
