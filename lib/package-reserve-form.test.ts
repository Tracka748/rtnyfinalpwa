import { describe, expect, it } from 'vitest'
import {
  buildReserveBody, initialReserveValues, normalizeGuestField, previewEventDate, previewGuests,
} from '@/lib/package-reserve-form'
import { validateForm, type RequestFormValues } from '@/lib/package-request-form'
import type { LiveDocument } from '@/lib/theme-package-public'
import { validateCreateRequestBody } from '@/lib/theme-package-public-validation'

const VERSION_ID = '11111111-1111-4111-8111-111111111111'
const TODAY = '2026-11-04'

function doc(meta: Partial<LiveDocument['meta']> = {}): LiveDocument {
  return {
    key: 'spooky', occasion: 'Birthday', theme: null, version_id: VERSION_ID, requestable: true, pricing: null, components: [],
    meta: { title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: 10, max_guests: 40, published_at: null, ...meta },
  }
}
const good: RequestFormValues = { eventDate: '2026-12-25', eventType: 'Birthday', guestCount: '20', budgetRange: '', notes: '' }

describe('buildReserveBody', () => {
  it('is the package as curated: version, intent, date and guests only', () => {
    expect(buildReserveBody(doc(), good)).toEqual({ version_id: VERSION_ID, intent: 'reserve', event_date: '2026-12-25', guest_count: 20 })
  })
  it('never carries a selection, a budget, prices or ids', () => {
    const body = buildReserveBody(doc(), { ...good, budgetRange: '$5,000+', eventType: 'Baby shower', notes: 'hi' })
    expect(body).not.toHaveProperty('selection')
    expect(body).not.toHaveProperty('budget_range')
    expect(Object.keys(body).sort()).toEqual(['event_date', 'event_type', 'guest_count', 'intent', 'notes', 'version_id'])
  })
  it('event type: sent only when it differs from the occasion; blank or whitespace sends nothing', () => {
    for (const eventType of ['Birthday', '  Birthday  ', '', '   ']) expect(buildReserveBody(doc(), { ...good, eventType })).not.toHaveProperty('event_type')
    expect(buildReserveBody(doc(), { ...good, eventType: '  Baby shower  ' }).event_type).toBe('Baby shower')
  })
  it('notes are trimmed and omitted when blank; the guest count is a number', () => {
    expect(buildReserveBody(doc(), { ...good, notes: '   ' })).not.toHaveProperty('notes')
    expect(buildReserveBody(doc(), { ...good, notes: '  hello  ' }).notes).toBe('hello')
    expect(buildReserveBody(doc(), { ...good, guestCount: ' 25 ' }).guest_count).toBe(25)
  })
  it('takes the version id from the loaded document', () => {
    expect(buildReserveBody(doc(), good).version_id).toBe(VERSION_ID)
  })
  it('is accepted by the server validator for every combination of optional fields', () => {
    for (const eventType of ['Birthday', '', 'Baby shower']) {
      for (const notes of ['', 'hello']) {
        expect(validateCreateRequestBody(buildReserveBody(doc(), { ...good, eventType, notes }), '2026-01-01').ok).toBe(true)
      }
    }
  })
})

describe('initialReserveValues (guest prefill)', () => {
  it('prefills the package occasion, an empty date and notes, and no budget', () => {
    expect(initialReserveValues(doc())).toEqual({ eventDate: '', eventType: 'Birthday', guestCount: '10', budgetRange: '', notes: '' })
  })
  it('uses 10 when there is no minimum', () => {
    expect(initialReserveValues(doc({ min_guests: null, max_guests: null })).guestCount).toBe('10')
  })
  it('uses the package minimum when it is above 10', () => {
    expect(initialReserveValues(doc({ min_guests: 25, max_guests: 60 })).guestCount).toBe('25')
  })
  it('clamps to the maximum when it is below 10', () => {
    expect(initialReserveValues(doc({ min_guests: null, max_guests: 6 })).guestCount).toBe('6')
  })
})

describe('normalizeGuestField (clamping)', () => {
  it('clamps below the minimum and above the maximum', () => {
    expect(normalizeGuestField('3', 10, 40, 10)).toBe('10')
    expect(normalizeGuestField('500', 10, 40, 10)).toBe('40')
  })
  it('keeps an in-range number, trimmed', () => {
    expect(normalizeGuestField(' 25 ', 10, 40, 10)).toBe('25')
  })
  it('falls back for empty or non-numeric input, and still clamps the fallback', () => {
    expect(normalizeGuestField('', 10, 40, 12)).toBe('12')
    expect(normalizeGuestField('abc', 10, 40, 12)).toBe('12')
    expect(normalizeGuestField('', 10, 40, 99)).toBe('40')
  })
  it('with no range it still stays within 1 to 10000', () => {
    expect(normalizeGuestField('0', null, null, 5)).toBe('1')
    expect(normalizeGuestField('99999', null, null, 5)).toBe('10000')
  })
})

describe('previewGuests', () => {
  it('a complete number inside the package range is returned', () => {
    expect(previewGuests('25', 10, 40)).toBe(25)
    expect(previewGuests(' 25 ', 10, 40)).toBe(25)
    expect(previewGuests('10', 10, 40)).toBe(10) // lower edge
    expect(previewGuests('40', 10, 40)).toBe(40) // upper edge
  })
  it('empty or blank -> null', () => {
    expect(previewGuests('', 10, 40)).toBeNull()
    expect(previewGuests('   ', 10, 40)).toBeNull()
  })
  it('non-numeric -> null', () => {
    for (const t of ['abc', '2o', '12.5', '-5', '1e3', '+7', '1 2']) expect(previewGuests(t, 10, 40)).toBeNull()
  })
  it('too low -> null', () => {
    expect(previewGuests('9', 10, 40)).toBeNull()
    expect(previewGuests('0', null, null)).toBeNull()
  })
  it('too high -> null', () => {
    expect(previewGuests('41', 10, 40)).toBeNull()
    expect(previewGuests('10001', null, null)).toBeNull()
    expect(previewGuests('1234567', null, null)).toBeNull()
  })
  it('with no limits, anything from 1 to 10000 counts', () => {
    expect(previewGuests('1', null, null)).toBe(1)
    expect(previewGuests('10000', null, null)).toBe(10000)
  })
})

describe('previewEventDate', () => {
  it('a real date today or later is returned', () => {
    expect(previewEventDate(TODAY, TODAY)).toBe(TODAY)
    expect(previewEventDate('2027-01-05', TODAY)).toBe('2027-01-05')
    expect(previewEventDate('2028-02-29', TODAY)).toBe('2028-02-29')
  })
  it('past, impossible, partial or empty dates are not sent', () => {
    for (const v of ['2026-11-03', '2026-02-30', '2026-13-01', '2026-11', '', 'next week']) expect(previewEventDate(v, TODAY)).toBeNull()
  })
})

describe('validateForm still guards the reserve form', () => {
  const ctx = { today: TODAY, minGuests: 10, maxGuests: 40 }
  it('requires a date that is not in the past and a guest count within range', () => {
    expect(validateForm(good, ctx)).toEqual({})
    expect(validateForm({ ...good, eventDate: '' }, ctx).eventDate).toBeTruthy()
    expect(validateForm({ ...good, eventDate: '2026-11-03' }, ctx).eventDate).toBeTruthy()
    expect(validateForm({ ...good, guestCount: '5' }, ctx).guestCount).toBeTruthy()
    expect(validateForm({ ...good, guestCount: '41' }, ctx).guestCount).toBeTruthy()
    expect(validateForm({ ...good, eventType: 'x'.repeat(81) }, ctx).eventType).toBeTruthy()
    expect(validateForm({ ...good, notes: 'x'.repeat(2001) }, ctx).notes).toBeTruthy()
  })
})
