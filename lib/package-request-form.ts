// Pure form logic for the quote request sheet. Validation mirrors the server only for early, friendly
// feedback; the server stays the authority.

import { GUEST_LIMITS, clampGuestCount } from '@/lib/package-selection'
import type { LiveDocument } from '@/lib/theme-package-public'
import type { SelectionInput } from '@/lib/theme-package-public-validation'

export const EVENT_TYPE_MAX = 80
export const NOTES_MAX = 2000

export interface RequestFormValues {
  eventDate: string
  eventType: string
  guestCount: string
  budgetRange: string // '' = "Not sure yet" (nothing is sent)
  notes: string
}
export type FormField = keyof RequestFormValues
export type FormErrors = Partial<Record<FormField, string>>

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/** The guest field always follows the page's current guest count, clamped to the package range. */
export function guestFieldValue(pageGuests: number, min: number | null, max: number | null): string {
  return String(clampGuestCount(pageGuests, min, max))
}

/** A fresh form: no date, the package occasion as event type, "Not sure yet", no notes. */
export function initialFormValues(doc: LiveDocument, pageGuests: number): RequestFormValues {
  return {
    eventDate: '',
    eventType: doc.occasion,
    guestCount: guestFieldValue(pageGuests, doc.meta.min_guests, doc.meta.max_guests),
    budgetRange: '',
    notes: '',
  }
}

/** The same values with the guest count replaced by the page's current (clamped) guest count. */
export function withPageGuestCount(
  values: RequestFormValues,
  pageGuests: number,
  min: number | null,
  max: number | null
): RequestFormValues {
  return { ...values, guestCount: guestFieldValue(pageGuests, min, max) }
}

export function validateForm(
  v: RequestFormValues,
  ctx: { today: string; minGuests: number | null; maxGuests: number | null }
): FormErrors {
  const e: FormErrors = {}

  if (!v.eventDate) e.eventDate = 'Choose an event date.'
  else if (!isRealDate(v.eventDate)) e.eventDate = 'Enter a valid date.'
  else if (v.eventDate < ctx.today) e.eventDate = 'The event date can’t be in the past.'

  const guests = v.guestCount.trim()
  if (!/^\d{1,6}$/.test(guests)) e.guestCount = 'Enter the number of guests.'
  else {
    const n = Number(guests)
    const lo = Math.max(GUEST_LIMITS.min, ctx.minGuests ?? GUEST_LIMITS.min)
    const hi = Math.min(GUEST_LIMITS.max, ctx.maxGuests ?? GUEST_LIMITS.max)
    if (n < lo || n > hi) e.guestCount = `This package is for ${lo}–${hi} guests.`
  }

  if (CONTROL_CHARS_RE.test(v.eventType)) e.eventType = 'Remove special characters from the event type.'
  else if (Array.from(v.eventType.trim()).length > EVENT_TYPE_MAX) e.eventType = `Keep the event type to ${EVENT_TYPE_MAX} characters.`

  if (v.notes.length > NOTES_MAX) e.notes = `Keep notes to ${NOTES_MAX} characters.`
  return e
}

export interface RequestBody {
  version_id: string
  selection: SelectionInput
  event_date: string
  guest_count: number
  budget_range?: string
  event_type?: string
  notes?: string
}

/** Never carries prices, package ids, a user id or an email: only what the customer chose. */
export function buildRequestBody(doc: LiveDocument, selection: SelectionInput, v: RequestFormValues): RequestBody {
  const body: RequestBody = {
    version_id: doc.version_id,
    selection,
    event_date: v.eventDate,
    guest_count: Number(v.guestCount.trim()),
  }
  if (v.budgetRange.trim() !== '') body.budget_range = v.budgetRange
  const eventType = v.eventType.trim()
  if (eventType !== '' && eventType !== doc.occasion.trim()) body.event_type = eventType
  const notes = v.notes.trim()
  if (notes !== '') body.notes = notes
  return body
}

// ---- server responses ----

export type RequestOutcome =
  | { kind: 'created'; requestId: string }
  | { kind: 'duplicate'; requestId: string }
  | { kind: 'sign_in' }
  | { kind: 'verify_email' }
  | { kind: 'package_updated' }
  | { kind: 'rate_limited' }
  | { kind: 'not_available' }
  | { kind: 'invalid'; message: string; field?: FormField }
  | { kind: 'error' }

export function fieldFromServerMessage(message: string): FormField | undefined {
  const m = message.toLowerCase()
  if (m.startsWith('event_date')) return 'eventDate'
  if (m.startsWith('guest_count') || m.startsWith('guest count')) return 'guestCount'
  if (m.startsWith('event_type')) return 'eventType'
  if (m.startsWith('budget_range')) return 'budgetRange'
  if (m.startsWith('notes')) return 'notes'
  return undefined
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function classifyRequestResponse(status: number, body: unknown): RequestOutcome {
  const data = isObject(body) ? body : {}
  const message = typeof data.error === 'string' ? data.error : ''
  switch (status) {
    case 201: {
      const id = isObject(data.data) ? data.data.request_id : undefined
      return typeof id === 'string' && id ? { kind: 'created', requestId: id } : { kind: 'error' }
    }
    case 401:
      return { kind: 'sign_in' }
    case 403:
      return /verified email/i.test(message) ? { kind: 'verify_email' } : { kind: 'error' }
    case 404:
      return { kind: 'not_available' }
    case 409:
      return typeof data.request_id === 'string' && data.request_id
        ? { kind: 'duplicate', requestId: data.request_id }
        : { kind: 'package_updated' }
    case 429:
      return { kind: 'rate_limited' }
    case 400: {
      const text = message.slice(0, 200)
      return text ? { kind: 'invalid', message: text, field: fieldFromServerMessage(text) } : { kind: 'error' }
    }
    default:
      return { kind: 'error' }
  }
}

/** Human copy for the non-success outcomes. Never raw server text, never a promised response time. */
export function outcomeCopy(outcome: Exclude<RequestOutcome, { kind: 'created' | 'duplicate' | 'sign_in' }>): string {
  switch (outcome.kind) {
    case 'verify_email':
      return 'You need to verify your email address before you can send a request. Check your inbox for the verification message, then try again.'
    case 'package_updated':
      return 'This package was updated while you were looking at it. Reload it to see the latest options, then send your request again.'
    case 'rate_limited':
      return 'You’ve sent a lot of requests recently. Please try again later.'
    case 'not_available':
      return 'This package is no longer available.'
    case 'invalid':
      return outcome.message
    case 'error':
      return 'Something went wrong sending your request. Please try again.'
  }
}
