import { describe, expect, it } from 'vitest'
import { validateSaveDraft } from '@/lib/package-validation'

const err = (r: { ok: boolean }) => (r as { ok: false; error: string }).error
const save = (body: Record<string, unknown>) => validateSaveDraft({ expected_revision: 1, ...body })

describe('validateSaveDraft: meta.pricing_terms', () => {
  const GOOD = {
    mode: 'structured', base_price: 675, included_guests: 10, extra_guest_price: 30, service_charge_pct: 20,
    service_charge_label: 'service charge', deposit_amount: 200, balance_due_days: 10, notes: ['Taxes included'],
  }
  const terms = (t: unknown) => save({ meta: { pricing_terms: t } })
  const withGood = (patch: Record<string, unknown>) => terms({ ...GOOD, ...patch })
  const metaOf = (r: ReturnType<typeof save>) => (r as { ok: true; value: { meta: { pricing_terms: unknown } } }).value.meta.pricing_terms

  it('accepts a full structured object and returns it normalized', () => {
    expect(metaOf(terms(GOOD))).toEqual(GOOD)
  })
  it('defaults optional fields when omitted or null (extra price, service charge, label, due days, notes)', () => {
    const min = { mode: 'structured', base_price: 500, included_guests: 5, deposit_amount: 0 }
    expect(metaOf(terms(min))).toEqual({
      mode: 'structured', base_price: 500, included_guests: 5, extra_guest_price: 0, service_charge_pct: 0,
      service_charge_label: null, deposit_amount: 0, balance_due_days: 0, notes: [],
    })
    expect(withGood({ extra_guest_price: null, service_charge_pct: null, balance_due_days: null, service_charge_label: null, notes: null }).ok).toBe(true)
  })
  it('null clears; an absent key leaves it alone', () => {
    const cleared = terms(null)
    expect(cleared.ok).toBe(true)
    expect(metaOf(cleared)).toBeNull()
    const absent = save({ meta: { title: 'x' } })
    expect((absent as { value: { meta: object } }).value.meta).not.toHaveProperty('pricing_terms')
  })
  it('rejects non-objects, a missing/bad mode and unknown keys', () => {
    for (const t of ['x', 5, [], true]) expect(terms(t).ok).toBe(false)
    expect(terms({}).ok).toBe(false)
    expect(err(terms({ mode: 'weird' }))).toBe('pricing mode must be structured or free_text')
    expect(err(withGood({ discount: 5 }))).toContain('Unknown field')
    expect(err(terms({ mode: 'free_text', free_text: 'x', total: 1 }))).toContain('Unknown field')
  })
  it('rejects structured fields in free-text mode and free_text in structured mode', () => {
    expect(err(terms({ mode: 'free_text', free_text: 'x', base_price: 5 }))).toContain('not allowed in free-text')
    expect(err(withGood({ free_text: 'x' }))).toContain('not allowed in structured')
  })

  it('base_price: 0 and 1,000,000 pass; negative, 1,000,000.01, non-number and 3 decimals fail', () => {
    for (const v of [0, 1_000_000, 0.01]) expect(withGood({ base_price: v, deposit_amount: 0 }).ok).toBe(true)
    for (const v of [-0.01, 1_000_000.01, '5', null, NaN, 10.005]) expect(withGood({ base_price: v }).ok).toBe(false)
    expect(err(withGood({ base_price: 10.005 }))).toContain('two decimal places')
    expect(withGood({ base_price: undefined }).ok).toBe(false)
  })
  it('included_guests: whole 1..10,000', () => {
    for (const v of [1, 10000]) expect(withGood({ included_guests: v }).ok).toBe(true)
    for (const v of [0, 10001, 1.5, '5', null, -1]) expect(withGood({ included_guests: v }).ok).toBe(false)
  })
  it('extra_guest_price: 0..100,000', () => {
    for (const v of [0, 100_000]) expect(withGood({ extra_guest_price: v }).ok).toBe(true)
    for (const v of [-1, 100_000.01, '3', 1.234]) expect(withGood({ extra_guest_price: v }).ok).toBe(false)
  })
  it('service_charge_pct: 0..100, two decimals', () => {
    for (const v of [0, 100, 7.25]) expect(withGood({ service_charge_pct: v, deposit_amount: 0 }).ok).toBe(true)
    for (const v of [-0.01, 100.01, '20', 7.255]) expect(withGood({ service_charge_pct: v }).ok).toBe(false)
  })
  it('service_charge_label: up to 80 characters, blank becomes null', () => {
    expect(withGood({ service_charge_label: 'x'.repeat(80) }).ok).toBe(true)
    expect(withGood({ service_charge_label: 'x'.repeat(81) }).ok).toBe(false)
    expect(withGood({ service_charge_label: 5 }).ok).toBe(false)
    expect(metaOf(withGood({ service_charge_label: '   ' }))).toMatchObject({ service_charge_label: null })
    expect(metaOf(withGood({ service_charge_label: '  Gratuity ' }))).toMatchObject({ service_charge_label: 'Gratuity' })
  })
  it('deposit_amount: required, 0..2,000,000, and never above the package total', () => {
    expect(withGood({ deposit_amount: 0 }).ok).toBe(true)
    expect(withGood({ deposit_amount: undefined }).ok).toBe(false)
    expect(withGood({ deposit_amount: -1 }).ok).toBe(false)
    expect(withGood({ deposit_amount: 2_000_000.01 }).ok).toBe(false)
    // total = 675 + 20% = 810
    expect(withGood({ deposit_amount: 810 }).ok).toBe(true)
    expect(err(withGood({ deposit_amount: 810.01 }))).toBe('deposit cannot be more than the package total')
  })
  it('deposit above 2,000,000 is rejected even when the base would allow it', () => {
    expect(err(withGood({ base_price: 1_000_000, service_charge_pct: 100, deposit_amount: 2_000_000.01 }))).toContain('deposit_amount must be between')
    expect(withGood({ base_price: 1_000_000, service_charge_pct: 100, deposit_amount: 2_000_000 }).ok).toBe(true)
  })
  it('pins the rounding pair: base 100.10 with 7.25% -> total 107.36; deposit 107.36 passes, 107.37 is rejected', () => {
    const t = { base_price: 100.10, service_charge_pct: 7.25 }
    expect(withGood({ ...t, deposit_amount: 107.36 }).ok).toBe(true)
    const over = withGood({ ...t, deposit_amount: 107.37 })
    expect(over.ok).toBe(false)
    expect(err(over)).toBe('deposit cannot be more than the package total')
  })
  it('balance_due_days: whole 0..365', () => {
    for (const v of [0, 365]) expect(withGood({ balance_due_days: v }).ok).toBe(true)
    for (const v of [-1, 366, 1.5, '10']) expect(withGood({ balance_due_days: v }).ok).toBe(false)
  })
  it('notes: at most 12, each 1..200 characters, trimmed', () => {
    expect(withGood({ notes: Array.from({ length: 12 }, () => 'n') }).ok).toBe(true)
    expect(withGood({ notes: Array.from({ length: 13 }, () => 'n') }).ok).toBe(false)
    expect(withGood({ notes: ['x'.repeat(200)] }).ok).toBe(true)
    for (const n of ['x'.repeat(201), '', '  ', 5]) expect(withGood({ notes: [n] }).ok).toBe(false)
    expect(withGood({ notes: 'nope' }).ok).toBe(false)
    expect(metaOf(withGood({ notes: ['  hi  '] }))).toMatchObject({ notes: ['hi'] })
  })
  it('free text: 1..2000 characters, trimmed, notes allowed', () => {
    expect(metaOf(terms({ mode: 'free_text', free_text: '  Call us  ', notes: ['n'] }))).toEqual({ mode: 'free_text', free_text: 'Call us', notes: ['n'] })
    expect(terms({ mode: 'free_text', free_text: 'x'.repeat(2000) }).ok).toBe(true)
    for (const t of ['x'.repeat(2001), '', '   ', 5, undefined]) expect(terms({ mode: 'free_text', free_text: t }).ok).toBe(false)
  })
})
