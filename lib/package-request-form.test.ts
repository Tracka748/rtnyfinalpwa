import { describe, expect, it } from 'vitest'
import {
  buildRequestBody, classifyRequestResponse, EVENT_TYPE_MAX, fieldFromServerMessage, guestFieldValue,
  initialFormValues, NOTES_MAX, outcomeCopy, validateForm, withPageGuestCount, type RequestFormValues,
} from '@/lib/package-request-form'
import type { LiveDocument } from '@/lib/theme-package-public'
import { BUDGET_RANGES, validateCreateRequestBody } from '@/lib/theme-package-public-validation'

const VERSION_ID = '11111111-1111-4111-8111-111111111111'
const COMP_ID = '22222222-2222-4222-8222-222222222222'
const TODAY = '2026-11-04'

function doc(over: Partial<LiveDocument['meta']> = {}): LiveDocument {
  return {
    key: 'spooky_birthday', occasion: 'Birthday', theme: null, version_id: VERSION_ID, requestable: true, pricing: null, components: [],
    meta: { title: 'Spooky', subtitle: null, description: null, cover_image_url: null, magazine_url: null, price_note: null, min_guests: 10, max_guests: 40, published_at: null, ...over },
  }
}
const ctx = { today: TODAY, minGuests: 10 as number | null, maxGuests: 40 as number | null }
const good: RequestFormValues = { eventDate: '2026-12-25', eventType: 'Birthday', guestCount: '20', budgetRange: '', notes: '' }
const selection = { components: [{ component_id: COMP_ID, included: true }] }

describe('initialFormValues / guestFieldValue / withPageGuestCount', () => {
  it('a fresh form: no date, the occasion as event type, "Not sure yet", no notes, the clamped page guest count', () => {
    expect(initialFormValues(doc(), 25)).toEqual({ eventDate: '', eventType: 'Birthday', guestCount: '25', budgetRange: '', notes: '' })
    expect(initialFormValues(doc(), 5).guestCount).toBe('10')
    expect(initialFormValues(doc(), 99).guestCount).toBe('40')
    expect(initialFormValues(doc({ min_guests: null, max_guests: null }), 300).guestCount).toBe('300')
  })
  it('guestFieldValue clamps the page value into the package range', () => {
    expect(guestFieldValue(25, 10, 40)).toBe('25')
    expect(guestFieldValue(1, 10, 40)).toBe('10')
    expect(guestFieldValue(500, 10, 40)).toBe('40')
    expect(guestFieldValue(Number.NaN, 10, 40)).toBe('10')
    expect(guestFieldValue(0, null, null)).toBe('1')
  })
  it('withPageGuestCount replaces only the guest count (a stale copy is overwritten) and does not mutate', () => {
    const stale: RequestFormValues = { eventDate: '2027-01-01', eventType: 'Baby shower', guestCount: '12', budgetRange: '$500–$1,000', notes: 'hello' }
    const fresh = withPageGuestCount(stale, 30, 10, 40)
    expect(fresh).toEqual({ ...stale, guestCount: '30' })
    expect(stale.guestCount).toBe('12')
    expect(withPageGuestCount(stale, 99, 10, 40).guestCount).toBe('40') // clamped, e.g. after sign-in resume
  })
  it('a form reset after a confirmed request equals a brand-new form', () => {
    const afterRequest: RequestFormValues = { eventDate: '2027-01-01', eventType: 'Baby shower', guestCount: '33', budgetRange: '$5,000+', notes: 'x' }
    expect(afterRequest).not.toEqual(initialFormValues(doc(), 20))
    expect(initialFormValues(doc(), 20)).toEqual({ eventDate: '', eventType: 'Birthday', guestCount: '20', budgetRange: '', notes: '' })
  })
})

describe('validateForm', () => {
  it('a good form has no errors', () => {
    expect(validateForm(good, ctx)).toEqual({})
  })
  it('the event date is required, real, and not in the past (today is allowed)', () => {
    expect(validateForm({ ...good, eventDate: '' }, ctx).eventDate).toBeDefined()
    expect(validateForm({ ...good, eventDate: '2026-02-30' }, ctx).eventDate).toBeDefined()
    expect(validateForm({ ...good, eventDate: 'tomorrow' }, ctx).eventDate).toBeDefined()
    expect(validateForm({ ...good, eventDate: '2026-11-03' }, ctx).eventDate).toContain('past')
    expect(validateForm({ ...good, eventDate: TODAY }, ctx).eventDate).toBeUndefined()
    expect(validateForm({ ...good, eventDate: '2028-02-29' }, ctx).eventDate).toBeUndefined()
  })
  it('guests must be a whole number within the package range', () => {
    for (const bad of ['', 'abc', '12.5', '-3', '1234567']) expect(validateForm({ ...good, guestCount: bad }, ctx).guestCount).toBeDefined()
    expect(validateForm({ ...good, guestCount: '9' }, ctx).guestCount).toContain('10')
    expect(validateForm({ ...good, guestCount: '41' }, ctx).guestCount).toContain('40')
    expect(validateForm({ ...good, guestCount: '10' }, ctx).guestCount).toBeUndefined()
    expect(validateForm({ ...good, guestCount: '40' }, ctx).guestCount).toBeUndefined()
  })
  it('without a package range the limits are 1 to 10000', () => {
    const open = { ...ctx, minGuests: null, maxGuests: null }
    expect(validateForm({ ...good, guestCount: '0' }, open).guestCount).toBeDefined()
    expect(validateForm({ ...good, guestCount: '10001' }, open).guestCount).toBeDefined()
    expect(validateForm({ ...good, guestCount: '10000' }, open).guestCount).toBeUndefined()
  })
  it('event type: at most 80 characters (counted as characters) and no control characters', () => {
    expect(validateForm({ ...good, eventType: 'x'.repeat(EVENT_TYPE_MAX) }, ctx).eventType).toBeUndefined()
    expect(validateForm({ ...good, eventType: 'x'.repeat(EVENT_TYPE_MAX + 1) }, ctx).eventType).toBeDefined()
    expect(validateForm({ ...good, eventType: '😀'.repeat(EVENT_TYPE_MAX) }, ctx).eventType).toBeUndefined()
    expect(validateForm({ ...good, eventType: 'bad\nvalue' }, ctx).eventType).toBeDefined()
    expect(validateForm({ ...good, eventType: 'a\u0000b' }, ctx).eventType).toBeDefined()
    expect(validateForm({ ...good, eventType: '' }, ctx).eventType).toBeUndefined() // blank is allowed: nothing is sent
  })
  it('notes: at most 2000 characters', () => {
    expect(validateForm({ ...good, notes: 'x'.repeat(NOTES_MAX) }, ctx).notes).toBeUndefined()
    expect(validateForm({ ...good, notes: 'x'.repeat(NOTES_MAX + 1) }, ctx).notes).toBeDefined()
  })
  it('reports every problem at once', () => {
    const errors = validateForm({ eventDate: '', eventType: 'x'.repeat(81), guestCount: '', budgetRange: '', notes: 'x'.repeat(2001) }, ctx)
    expect(Object.keys(errors).sort()).toEqual(['eventDate', 'eventType', 'guestCount', 'notes'])
  })
})

describe('buildRequestBody', () => {
  it('sends the version, selection, date and guests; leaves out everything the customer left blank', () => {
    expect(buildRequestBody(doc(), selection, good)).toEqual({
      version_id: VERSION_ID, intent: 'quote', selection, event_date: '2026-12-25', guest_count: 20,
    })
  })
  it('"Not sure yet" sends no budget; a chosen budget is sent as is', () => {
    expect(buildRequestBody(doc(), selection, good)).not.toHaveProperty('budget_range')
    expect(buildRequestBody(doc(), selection, { ...good, budgetRange: '$500–$1,000' }).budget_range).toBe('$500–$1,000')
  })
  it('the event type is sent only when it differs from the occasion; blank sends nothing', () => {
    expect(buildRequestBody(doc(), selection, { ...good, eventType: 'Birthday' })).not.toHaveProperty('event_type')
    expect(buildRequestBody(doc(), selection, { ...good, eventType: '  Birthday  ' })).not.toHaveProperty('event_type')
    expect(buildRequestBody(doc(), selection, { ...good, eventType: '' })).not.toHaveProperty('event_type')
    expect(buildRequestBody(doc(), selection, { ...good, eventType: '   ' })).not.toHaveProperty('event_type')
    expect(buildRequestBody(doc(), selection, { ...good, eventType: '  Baby shower  ' }).event_type).toBe('Baby shower')
  })
  it('notes are trimmed and omitted when blank', () => {
    expect(buildRequestBody(doc(), selection, { ...good, notes: '   ' })).not.toHaveProperty('notes')
    expect(buildRequestBody(doc(), selection, { ...good, notes: '  hello  ' }).notes).toBe('hello')
  })
  it('takes the version id from the loaded document and the guest count as a number', () => {
    const body = buildRequestBody(doc(), selection, { ...good, guestCount: ' 25 ' })
    expect(body.version_id).toBe(VERSION_ID)
    expect(body.guest_count).toBe(25)
  })
  it('only ever contains the allowed keys: no prices, package ids, user id or email', () => {
    const body = buildRequestBody(doc(), selection, { ...good, budgetRange: BUDGET_RANGES[0], eventType: 'Baby shower', notes: 'hi' })
    const allowed = ['version_id', 'intent', 'selection', 'event_date', 'guest_count', 'budget_range', 'event_type', 'notes']
    expect(Object.keys(body).every(k => allowed.includes(k))).toBe(true)
  })
  it('is accepted by the server validator for every combination of optional fields', () => {
    for (const budgetRange of ['', ...BUDGET_RANGES]) {
      for (const eventType of ['Birthday', '', 'Baby shower']) {
        for (const notes of ['', 'hello']) {
          const body = buildRequestBody(doc(), selection, { ...good, budgetRange, eventType, notes })
          expect(validateCreateRequestBody(body, '2026-01-01').ok).toBe(true)
        }
      }
    }
  })
})

describe('classifyRequestResponse', () => {
  it('201 with a request id -> created (without one -> error)', () => {
    expect(classifyRequestResponse(201, { success: true, data: { request_id: 'abc' } })).toEqual({ kind: 'created', requestId: 'abc', reservation: null })
    expect(classifyRequestResponse(201, { success: true, data: {} })).toEqual({ kind: 'error' })
    expect(classifyRequestResponse(201, null)).toEqual({ kind: 'error' })
  })
  it('201 carries the allowlisted reservation numbers (never the stored terms)', () => {
    const reservation = { mode: 'structured', guest_count: 20, extra_guests: 10, extras_total: 300, subtotal: 975, service_charge: 195, total: 1170, deposit: 200, balance: 970, balance_due_date: '2099-01-05' }
    const out = classifyRequestResponse(201, { success: true, data: { request_id: 'abc', request_kind: 'reserve', reservation: { ...reservation, terms: { base_price: 675 } } } })
    expect(out).toEqual({ kind: 'created', requestId: 'abc', reservation })
    expect(classifyRequestResponse(201, { success: true, data: { request_id: 'abc', reservation: { mode: 'free_text' } } })).toEqual({ kind: 'created', requestId: 'abc', reservation: { mode: 'free_text' } })
  })
  it('401 -> sign_in', () => {
    expect(classifyRequestResponse(401, { success: false, error: 'Not authenticated' })).toEqual({ kind: 'sign_in' })
  })
  it('403 -> verify_email only for the verified-email message', () => {
    expect(classifyRequestResponse(403, { success: false, error: 'A verified email address is required to send a request' })).toEqual({ kind: 'verify_email' })
    expect(classifyRequestResponse(403, { success: false, error: 'Forbidden' })).toEqual({ kind: 'error' })
  })
  it('409 with a request id -> duplicate; without -> package_updated', () => {
    expect(classifyRequestResponse(409, { success: false, error: 'You already sent this request a moment ago', request_id: 'r1' })).toEqual({ kind: 'duplicate', requestId: 'r1' })
    expect(classifyRequestResponse(409, { success: false, error: 'This package was updated; reload it and try again' })).toEqual({ kind: 'package_updated' })
    expect(classifyRequestResponse(409, { success: false, error: 'A record with these values already exists' })).toEqual({ kind: 'package_updated' })
  })
  it('429 -> rate_limited, 404 -> not_available', () => {
    expect(classifyRequestResponse(429, { success: false, error: 'Too many requests; please try again later' })).toEqual({ kind: 'rate_limited' })
    expect(classifyRequestResponse(404, { success: false, error: 'Package not found' })).toEqual({ kind: 'not_available' })
  })
  it('400 -> invalid with the server message and, when possible, the field', () => {
    expect(classifyRequestResponse(400, { success: false, error: 'event_date cannot be in the past' })).toEqual({
      kind: 'invalid', message: 'event_date cannot be in the past', field: 'eventDate',
    })
    expect(classifyRequestResponse(400, { success: false, error: "guest count is outside this package's range" })).toMatchObject({ kind: 'invalid', field: 'guestCount' })
    expect(classifyRequestResponse(400, { success: false, error: 'selected option does not belong to component "Cake"' })).toEqual({
      kind: 'invalid', message: 'selected option does not belong to component "Cake"', field: undefined,
    })
    expect(classifyRequestResponse(400, {})).toEqual({ kind: 'error' })
  })
  it('anything else, a network failure (0) or a non-object body -> error', () => {
    for (const status of [0, 500, 502, 503, 418]) expect(classifyRequestResponse(status, { success: false, error: 'boom' })).toEqual({ kind: 'error' })
    expect(classifyRequestResponse(500, 'text')).toEqual({ kind: 'error' })
    expect(classifyRequestResponse(500, null)).toEqual({ kind: 'error' })
  })
})

describe('fieldFromServerMessage', () => {
  it('maps the server validator and database messages to form fields', () => {
    expect(fieldFromServerMessage('event_date must be a real date in YYYY-MM-DD format')).toBe('eventDate')
    expect(fieldFromServerMessage('guest_count must be an integer from 1 to 10000')).toBe('guestCount')
    expect(fieldFromServerMessage("guest count is outside this package's range")).toBe('guestCount')
    expect(fieldFromServerMessage('event_type cannot contain control characters')).toBe('eventType')
    expect(fieldFromServerMessage('budget_range must be one of: Under $500')).toBe('budgetRange')
    expect(fieldFromServerMessage('notes must be at most 2000 characters')).toBe('notes')
    expect(fieldFromServerMessage('Unknown field(s): price')).toBeUndefined()
  })
})

describe('outcomeCopy', () => {
  const kinds = [
    { kind: 'verify_email' }, { kind: 'package_updated' }, { kind: 'rate_limited' }, { kind: 'not_available' }, { kind: 'error' },
  ] as const
  it('gives non-empty human copy for every failure outcome', () => {
    for (const k of kinds) expect(outcomeCopy(k).length).toBeGreaterThan(10)
  })
  it('never promises a response time or an email, and never leaks server text', () => {
    for (const k of kinds) {
      const text = outcomeCopy(k).toLowerCase()
      for (const forbidden of ['within', 'hours', 'minutes', 'business day', 'we will email', "we'll email", 'email you', 'shortly', 'soon', 'postgres', 'sql', 'exception']) {
        expect(text).not.toContain(forbidden)
      }
    }
  })
  it('an invalid outcome shows the (already user-facing) validation message', () => {
    expect(outcomeCopy({ kind: 'invalid', message: 'event_date cannot be in the past' })).toBe('event_date cannot be in the past')
  })
})
