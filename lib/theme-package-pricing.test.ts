import { describe, expect, it } from 'vitest'
import { buildPricing } from '@/lib/theme-package-pricing'

const EXAMPLE = {
  mode: 'structured', base_price: 675, included_guests: 10, extra_guest_price: 30, service_charge_pct: 20,
  service_charge_label: null, deposit_amount: 200, balance_due_days: 10, notes: [] as string[],
}

describe('buildPricing', () => {
  it('generates the example lines in order', () => {
    const p = buildPricing(EXAMPLE)!
    expect(p.mode).toBe('structured')
    expect(p.reservable).toBe(true)
    expect(p.lines).toEqual([
      '$675 for 10 guests',
      '$30 for each additional guest',
      '20% service charge',
      '$200 deposit required to reserve the date',
      'Remaining balance due 10 days before the event',
    ])
    expect(p.terms).toEqual({
      base_price: 675, included_guests: 10, extra_guest_price: 30, service_charge_pct: 20,
      service_charge_label: null, deposit_amount: 200, balance_due_days: 10,
    })
  })
  it('lines contain only generated lines; notes stay a separate array', () => {
    const p = buildPricing({ ...EXAMPLE, notes: ['Taxes included', 'Parking is free'] })!
    expect(p.notes).toEqual(['Taxes included', 'Parking is free'])
    expect(p.lines).toHaveLength(5)
    expect(p.lines.join('|')).not.toContain('Taxes included')
  })
  it('uses "1 guest" in the singular', () => {
    expect(buildPricing({ ...EXAMPLE, included_guests: 1 })!.lines[0]).toBe('$675 for 1 guest')
  })
  it('uses the service charge label', () => {
    expect(buildPricing({ ...EXAMPLE, service_charge_label: 'gratuity' })!.lines[2]).toBe('20% gratuity')
    expect(buildPricing({ ...EXAMPLE, service_charge_pct: 7.5 })!.lines[2]).toBe('7.5% service charge')
  })
  it('skips the extra-guest line when the extra price is 0', () => {
    const p = buildPricing({ ...EXAMPLE, extra_guest_price: 0 })!
    expect(p.lines).toEqual([
      '$675 for 10 guests', '20% service charge', '$200 deposit required to reserve the date',
      'Remaining balance due 10 days before the event',
    ])
  })
  it('skips the service charge line when the percentage is 0', () => {
    const p = buildPricing({ ...EXAMPLE, service_charge_pct: 0 })!
    expect(p.lines).not.toContain('0% service charge')
    expect(p.lines).toHaveLength(4)
  })
  it('with no deposit there are no deposit and balance lines', () => {
    expect(buildPricing({ ...EXAMPLE, deposit_amount: 0 })!.lines).toEqual([
      '$675 for 10 guests', '$30 for each additional guest', '20% service charge',
    ])
  })
  it('balance wording: day of the event (0), singular day (1), plural days', () => {
    expect(buildPricing({ ...EXAMPLE, balance_due_days: 0 })!.lines.at(-1)).toBe('Remaining balance due on the day of the event')
    expect(buildPricing({ ...EXAMPLE, balance_due_days: 1 })!.lines.at(-1)).toBe('Remaining balance due 1 day before the event')
    expect(buildPricing({ ...EXAMPLE, balance_due_days: 14 })!.lines.at(-1)).toBe('Remaining balance due 14 days before the event')
  })
  it('prints whole dollars without cents and others with two decimals, with thousands separators', () => {
    const p = buildPricing({ ...EXAMPLE, base_price: 100.1, extra_guest_price: 12.5, deposit_amount: 50.25 })!
    expect(p.lines[0]).toBe('$100.10 for 10 guests')
    expect(p.lines[1]).toBe('$12.50 for each additional guest')
    expect(p.lines[3]).toBe('$50.25 deposit required to reserve the date')
    expect(buildPricing({ ...EXAMPLE, base_price: 1000 })!.lines[0]).toBe('$1,000 for 10 guests')
  })
  it('free text returns the text and notes with no lines', () => {
    expect(buildPricing({ mode: 'free_text', free_text: 'Call for a quote', notes: ['n1'] })).toEqual({
      mode: 'free_text', reservable: true, lines: [], notes: ['n1'], free_text: 'Call for a quote',
    })
  })
  it('returns null for no terms or unusable values', () => {
    for (const v of [null, undefined, 5, 'x', [], {}, { mode: 'structured' }, { mode: 'free_text' }, { mode: 'other' }]) {
      expect(buildPricing(v)).toBeNull()
    }
  })
})
