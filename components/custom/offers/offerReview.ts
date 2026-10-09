// Pure helpers for wizard step 7 (preview + submit checklist). They read the
// saved offer row, so the preview matches exactly what will be submitted.

import type { OfferRecord } from './types'
import { PRICED_MODELS, formatPrice } from './types'
import { DAY_OPTIONS, RADIUS_OPTIONS, guestLabel, type CategoryConfig } from './categoryFields'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
}

// "Free", "$80 flat", "$25 per person", "Starting at $150", "Contact us".
export function priceWording(offer: Pick<OfferRecord, 'price' | 'pricing_model'>): string {
  switch (offer.pricing_model) {
    case 'free':
      return 'Free'
    case 'flat':
      return `${formatPrice(offer.price)} flat`
    case 'per_person':
      return `${formatPrice(offer.price)} per person`
    case 'starting_at':
      return `Starting at ${formatPrice(offer.price)}`
    case 'contact':
      return 'Contact us'
    default:
      return 'Pricing not set'
  }
}

export function groupSizeWording(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? `${guestLabel(min)} guests` : `${guestLabel(min)}–${guestLabel(max)} guests`
  if (min != null) return `${guestLabel(min)}+ guests`
  if (max != null) return `Up to ${guestLabel(max)} guests`
  return null
}

export function detailText(offer: Pick<OfferRecord, 'details'>, key: string): string | null {
  const v = isPlainObject(offer.details) ? offer.details[key] : undefined
  return typeof v === 'string' && v ? v : null
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export interface AvailabilitySummary {
  days: string | null
  hours: string | null
  confirmEach: boolean
  blackoutCount: number
  radius: string | null
}

export function availabilitySummary(offer: Pick<OfferRecord, 'availability'>): AvailabilitySummary {
  const a = isPlainObject(offer.availability) ? offer.availability : {}
  const days = Array.isArray(a.days) ? a.days.filter((d): d is number => Number.isInteger(d)) : []
  const dayLabels = DAY_OPTIONS.filter((d) => days.includes(d.value)).map((d) => d.label)
  const start = typeof a.start_time === 'string' ? a.start_time : null
  const end = typeof a.end_time === 'string' ? a.end_time : null
  const radius = typeof a.radius_miles === 'number' ? a.radius_miles : null
  return {
    days: dayLabels.length === 7 ? 'Every day' : dayLabels.length ? dayLabels.join(', ') : null,
    hours: start && end ? `${to12h(start)} – ${to12h(end)}${end <= start ? ' (next day)' : ''}` : null,
    confirmEach: a.confirm_each === true,
    blackoutCount: strings(a.blackout_dates).length,
    radius: radius === null ? null : RADIUS_OPTIONS.find((r) => r.value === radius)?.label ?? `${radius} miles`,
  }
}

// Additional requirements as label/value pairs, using the category's option labels.
export function requirementSummary(offer: Pick<OfferRecord, 'details'>, config: CategoryConfig): { label: string; value: string }[] {
  const details = isPlainObject(offer.details) ? offer.details : {}
  const rows: { label: string; value: string }[] = []
  for (const field of config.requirements?.fields ?? []) {
    const v = details[field.key]
    if (v === undefined || v === null || v === '') continue
    let value: string | null = null
    switch (field.kind) {
      case 'money':
        value = typeof v === 'number' ? formatPrice(v) : null
        break
      case 'number':
        value = field.options.find((o) => o.value === v)?.label ?? (typeof v === 'number' ? String(v) : null)
        break
      case 'choice':
        value = field.options.find((o) => o.value === v)?.label ?? (typeof v === 'string' ? v : null)
        break
      case 'multi': {
        const labels = strings(v).map((s) => field.options.find((o) => o.value === s)?.label ?? s)
        value = labels.length ? labels.join(', ') : null
        break
      }
      case 'note':
        value = typeof v === 'string' ? v : null
        break
    }
    if (value) rows.push({ label: field.label, value })
  }
  return rows
}

export function addOnList(offer: Pick<OfferRecord, 'add_ons'>): { name: string; price: number }[] {
  if (!Array.isArray(offer.add_ons)) return []
  return offer.add_ons.flatMap((a) =>
    isPlainObject(a) && typeof a.name === 'string' && typeof a.price === 'number' ? [{ name: a.name, price: a.price }] : []
  )
}

// ─── Submit checklist (mirrors the API's submit rules) ──────────────────────

export interface ChecklistItem {
  key: string
  label: string
  done: boolean
  step: number
  // Element to focus when the partner taps a missing item.
  focusId: string
}

export function submitChecklist(offer: OfferRecord): ChecklistItem[] {
  const priced = !!offer.pricing_model && PRICED_MODELS.has(offer.pricing_model)
  const a = isPlainObject(offer.availability) ? offer.availability : {}
  const hasDays = Array.isArray(a.days) && a.days.length > 0
  const pricingDone = !!offer.pricing_model && (!priced || offer.price > 0)

  return [
    { key: 'title', label: 'Offer name', done: !!offer.title?.trim(), step: 3, focusId: 'offer-title' },
    {
      key: 'pricing',
      label: priced ? 'Pricing and price' : 'Pricing',
      done: pricingDone,
      step: 3,
      focusId: offer.pricing_model && priced ? 'offer-price' : 'offer-pricing-model',
    },
    { key: 'includes', label: 'At least one included item', done: strings(offer.includes).length > 0, step: 3, focusId: 'offer-includes' },
    { key: 'max_guests', label: 'Maximum guests', done: (offer.max_guests ?? 0) >= 1, step: 3, focusId: 'offer-max-guests' },
    {
      key: 'availability',
      label: 'Availability (days or confirm each booking)',
      done: hasDays || a.confirm_each === true,
      step: 5,
      focusId: 'offer-availability',
    },
    { key: 'pitch', label: 'Why you (your pitch)', done: !!offer.pitch?.trim(), step: 6, focusId: 'offer-pitch' },
  ]
}
