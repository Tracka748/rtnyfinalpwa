import { describe, expect, it } from 'vitest'
import {
  capitalizeFirst, describeLine, describePricing, formatLongDate, formatUsd, guestRangeLabel, quoteLineNote, shortReference,
} from '@/lib/package-page-format'
import type { PublicPricing, PublicSnapshotItem } from '@/lib/theme-package-public'

const line = (over: Partial<PublicSnapshotItem> = {}): PublicSnapshotItem => ({
  component_id: 'c1', slot_label: 'Cake', option_id: 'o1', catalog_item_name: 'Cake', item_type: 'food', quantity: 1,
  pricing_model: 'flat', price_treatment: 'listed', price_status: 'priced', listed_price: 80, line_total: 80,
  price_note: null, guest_fit: true, ...over,
})
const quote: PublicPricing = { treatment: 'quote', price: null, pricing_model: null }

describe('formatUsd', () => {
  it('formats whole dollars without cents', () => {
    expect(formatUsd(0)).toBe('$0')
    expect(formatUsd(80)).toBe('$80')
    expect(formatUsd(1234)).toBe('$1,234')
    expect(formatUsd(1000000)).toBe('$1,000,000')
  })
  it('formats fractional amounts with two decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50')
    expect(formatUsd(0.5)).toBe('$0.50')
    expect(formatUsd(19.99)).toBe('$19.99')
  })
})

describe('describePricing (document level)', () => {
  it('listed price, with a per-guest hint for per-person services', () => {
    expect(describePricing({ treatment: 'listed', price: 250, pricing_model: 'per_person' })).toEqual({ text: '$250', detail: 'per guest', tone: 'price' })
    expect(describePricing({ treatment: 'listed', price: 99.5, pricing_model: 'flat' })).toEqual({ text: '$99.50', detail: null, tone: 'price' })
  })
  it('free', () => {
    expect(describePricing({ treatment: 'free', price: null, pricing_model: 'flat' })).toEqual({ text: 'Included', detail: 'at no charge', tone: 'free' })
  })
  it('quote, and a listed treatment with no price, never show a number', () => {
    expect(describePricing(quote)).toEqual({ text: 'Price on request', detail: null, tone: 'quote' })
    expect(describePricing({ treatment: 'listed', price: null, pricing_model: 'flat' }).text).toBe('Price on request')
  })
})

describe('describeLine (server preview line)', () => {
  it('falls back to the document pricing when there is no line or no price status (v1 snapshots)', () => {
    const fallback: PublicPricing = { treatment: 'listed', price: 40, pricing_model: 'flat' }
    expect(describeLine(undefined, fallback)).toEqual(describePricing(fallback))
    expect(describeLine(line({ price_status: null }), fallback)).toEqual(describePricing(fallback))
  })
  it('a priced line shows the server line total', () => {
    expect(describeLine(line({ line_total: 160, quantity: 2 }), quote)).toEqual({ text: '$160', detail: '× 2', tone: 'price' })
    expect(describeLine(line({ line_total: 80 }), quote)).toEqual({ text: '$80', detail: null, tone: 'price' })
  })
  it('a per-person line says the total is for the group', () => {
    expect(describeLine(line({ pricing_model: 'per_person', line_total: 1250 }), quote)).toEqual({ text: '$1,250', detail: 'total for your group', tone: 'price' })
  })
  it('a free line', () => {
    expect(describeLine(line({ price_status: 'free', line_total: 0, price_treatment: 'free' }), quote)).toEqual({ text: 'Included', detail: 'at no charge', tone: 'free' })
  })
  it('a quote line shows the server note, except the generic one', () => {
    const q = (note: string | null) => describeLine(line({ price_status: 'quote', line_total: null, price_note: note }), quote)
    expect(q('vendor to be assigned')).toEqual({ text: 'Price on request', detail: 'Vendor to be assigned', tone: 'quote' })
    expect(q('per-person price needs a guest count').detail).toBe('Per-person price needs a guest count')
    expect(q('price on request').detail).toBeNull()
    expect(q(null).detail).toBeNull()
  })
  it('a "priced" line with no total never invents a number', () => {
    expect(describeLine(line({ price_status: 'priced', line_total: null }), quote).text).toBe('Price on request')
  })
})

describe('quoteLineNote', () => {
  it('is empty for none and pluralises correctly', () => {
    for (const n of [0, null, undefined, -1]) expect(quoteLineNote(n)).toBeNull()
    expect(quoteLineNote(1)).toBe('+ 1 item priced on request')
    expect(quoteLineNote(2)).toBe('+ 2 items priced on request')
    expect(quoteLineNote(12)).toBe('+ 12 items priced on request')
  })
})

describe('guestRangeLabel', () => {
  it('covers every combination', () => {
    expect(guestRangeLabel(10, 40)).toBe('10–40 guests')
    expect(guestRangeLabel(25, 25)).toBe('25 guests')
    expect(guestRangeLabel(null, 40)).toBe('Up to 40 guests')
    expect(guestRangeLabel(10, null)).toBe('10+ guests')
    expect(guestRangeLabel(null, null)).toBeNull()
  })
})

describe('shortReference / capitalizeFirst', () => {
  it('builds a short, uppercase reference from the request id', () => {
    expect(shortReference('123e4567-e89b-12d3-a456-426614174000')).toBe('REQ-123E4567')
    expect(shortReference('abcdef12-0000-0000-0000-000000000000')).toBe('REQ-ABCDEF12')
  })
  it('capitalizes the first letter only', () => {
    expect(capitalizeFirst('vendor to be assigned')).toBe('Vendor to be assigned')
    expect(capitalizeFirst('')).toBe('')
  })
})

describe('formatLongDate', () => {
  it('formats a YYYY-MM-DD date without shifting the day', () => {
    expect(formatLongDate('2027-01-05')).toBe('Jan 5, 2027')
    expect(formatLongDate('2026-12-31')).toBe('Dec 31, 2026')
    expect(formatLongDate('2028-02-29')).toBe('Feb 29, 2028')
  })
  it('returns null for junk, impossible dates and missing values', () => {
    for (const v of ['2026-02-30', '2026-13-01', '2026-1-5', 'Jan 5', '', null, undefined]) expect(formatLongDate(v)).toBeNull()
  })
})
