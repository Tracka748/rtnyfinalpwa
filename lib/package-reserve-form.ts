// Pure helpers for the reserve sheet. The server stays the authority for every rule.

import { eventTypeToSend, initialFormValues, isRealDate, type RequestFormValues } from '@/lib/package-request-form'
import { clampGuestCount, defaultGuestCount, GUEST_LIMITS, parseGuestInput } from '@/lib/package-selection'
import type { LiveDocument } from '@/lib/theme-package-public'

export interface ReserveBody {
  version_id: string
  intent: 'reserve'
  event_date: string
  guest_count: number
  event_type?: string
  notes?: string
}

/** The package exactly as curated: no selection, no budget, never prices, ids, a user id or an email. */
export function buildReserveBody(doc: LiveDocument, v: RequestFormValues): ReserveBody {
  const body: ReserveBody = {
    version_id: doc.version_id,
    intent: 'reserve',
    event_date: v.eventDate,
    guest_count: Number(v.guestCount.trim()),
  }
  const eventType = eventTypeToSend(doc, v)
  if (eventType) body.event_type = eventType
  const notes = v.notes.trim()
  if (notes !== '') body.notes = notes
  return body
}

/** No date, the package occasion, the package minimum (or 10) clamped to the range, no budget, no notes. */
export function initialReserveValues(doc: LiveDocument): RequestFormValues {
  return initialFormValues(doc, defaultGuestCount(doc.meta.min_guests, doc.meta.max_guests))
}

/** The guest field after editing: digits parsed, then clamped to the package range. */
export function normalizeGuestField(text: string, min: number | null, max: number | null, fallback: number): string {
  return String(clampGuestCount(parseGuestInput(text, fallback), min, max))
}

/**
 * The guest count to ask the server about while the customer is still typing: only a complete,
 * digits-only number inside the package range. Anything else returns null (no request is made).
 */
export function previewGuests(text: string, min: number | null, max: number | null): number | null {
  const t = text.trim()
  if (!/^\d{1,6}$/.test(t)) return null
  const n = Number(t)
  const lo = Math.max(GUEST_LIMITS.min, min ?? GUEST_LIMITS.min)
  const hi = Math.min(GUEST_LIMITS.max, max ?? GUEST_LIMITS.max)
  return n >= lo && n <= hi ? n : null
}

/** The event date to send with a preview: a real date that is not in the past, else null. */
export function previewEventDate(value: string, today: string): string | null {
  return isRealDate(value) && value >= today ? value : null
}
