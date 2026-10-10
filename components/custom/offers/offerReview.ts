// Pure helpers for wizard step 7 (preview + submit checklist). They read the
// saved offer row, so the preview matches exactly what will be submitted.

import type { OfferRecord } from './types'
import { PRICED_MODELS, formatPrice } from './types'
import { DAY_OPTIONS, RADIUS_OPTIONS, guestLabel, type CategoryConfig } from './categoryFields'
import {
  appliesToLabel,
  discountTerms,
  eligibleLabel,
  isOfferType,
  monthlyLimitWording,
  offerTypeLabel,
} from './perks'
import { STEP } from '@/hooks/useOfferWizard'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
}

function detailsOf(offer: Pick<OfferRecord, 'details'>): Record<string, unknown> {
  return isPlainObject(offer.details) ? offer.details : {}
}

// "Free", "20% off", "$10 off", "Buy one, get one", "Special perk", "$80 flat",
// "$25 per person", "Starting at $150", "Contact us".
export function priceWording(offer: Pick<OfferRecord, 'price' | 'pricing_model' | 'details'>): string {
  const d = detailsOf(offer)
  switch (offer.pricing_model) {
    case 'free':
      return 'Free'
    case 'discount':
      return (
        discountTerms(
          typeof d.discount_type === 'string' ? d.discount_type : null,
          typeof d.discount_value === 'number' ? d.discount_value : null
        ) ?? 'Discount'
      )
    case 'bogo':
      return 'Buy one, get one'
    case 'perk':
      return 'Special perk'
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

// ─── Birthday perk summary (review preview) ──────────────────────────────────

const FIXED_PRICE_MODELS = new Set(['flat', 'per_person', 'starting_at', 'contact'])

export interface PerkSummaryRow {
  key: string
  label: string
  value: string | null
  focusId: string
}

// Fixed-price offers skip the offer-type row (they don't need one).
export function perkSummary(offer: Pick<OfferRecord, 'details' | 'pricing_model'>): PerkSummaryRow[] {
  const d = detailsOf(offer)
  const type = isOfferType(d.offer_type) ? d.offer_type : null
  const fixedPrice = !!offer.pricing_model && FIXED_PRICE_MODELS.has(offer.pricing_model)
  const rows: PerkSummaryRow[] = fixedPrice
    ? []
    : [{ key: 'offer_type', label: 'Offer type', value: type ? offerTypeLabel(type) : null, focusId: 'offer-detail-offer_type' }]
  if (type === 'discount') {
    rows.push({
      key: 'discount',
      label: 'Discount terms',
      value: discountTerms(
        typeof d.discount_type === 'string' ? d.discount_type : null,
        typeof d.discount_value === 'number' ? d.discount_value : null
      ),
      focusId: 'offer-detail-discount_type',
    })
  }
  rows.push(
    { key: 'applies_to', label: 'Applies to', value: strings(d.applies_to).map(appliesToLabel).join(', ') || null, focusId: 'offer-detail-applies_to' },
    { key: 'eligible', label: 'Who is eligible', value: strings(d.eligible).map(eligibleLabel).join(', ') || null, focusId: 'offer-detail-eligible' },
    {
      key: 'monthly_limit',
      label: 'Monthly limit',
      value: monthlyLimitWording(
        typeof d.monthly_limit === 'number' ? d.monthly_limit : null,
        typeof d.monthly_limit_label === 'string' ? d.monthly_limit_label : null
      ),
      focusId: 'offer-detail-monthly_limit',
    }
  )
  return rows
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
  const d = detailsOf(offer)
  const hasDays = Array.isArray(a.days) && a.days.length > 0
  const pricingDone = !!offer.pricing_model && (!priced || offer.price > 0)
  const fixedPrice = !!offer.pricing_model && FIXED_PRICE_MODELS.has(offer.pricing_model)
  const type = isOfferType(d.offer_type) ? d.offer_type : null
  const discountDone =
    (d.discount_type === 'percent' || d.discount_type === 'dollar') &&
    typeof d.discount_value === 'number' &&
    d.discount_value > 0
  const monthlyDone =
    (typeof d.monthly_limit === 'number' && d.monthly_limit >= 1) ||
    d.monthly_limit_label === 'unlimited' ||
    d.monthly_limit_label === 'confirm_each'

  const items: ChecklistItem[] = []
  // Fixed-price offers (Switch to a fixed price) don't need an offer type.
  if (!fixedPrice) {
    items.push({
      key: 'offer_type',
      label: type === 'discount' ? 'Offer type and discount terms' : 'Offer type',
      done: !!type && (type !== 'discount' || discountDone),
      step: STEP.perks,
      focusId: type === 'discount' && !discountDone ? 'offer-detail-discount_type' : 'offer-detail-offer_type',
    })
  }
  items.push(
    { key: 'applies_to', label: 'Applies to', done: strings(d.applies_to).length > 0, step: STEP.perks, focusId: 'offer-detail-applies_to' },
    { key: 'eligible', label: 'Who is eligible', done: strings(d.eligible).length > 0, step: STEP.perks, focusId: 'offer-detail-eligible' },
    { key: 'monthly_limit', label: 'Monthly limit', done: monthlyDone, step: STEP.perks, focusId: 'offer-detail-monthly_limit' },
    { key: 'title', label: 'Offer name', done: !!offer.title?.trim(), step: STEP.offer, focusId: 'offer-title' },
    {
      key: 'pricing',
      label: priced ? 'Pricing and price' : 'Pricing',
      done: pricingDone,
      // Perk offers are priced on the perks step.
      step: fixedPrice || !type ? STEP.offer : STEP.perks,
      focusId: fixedPrice || !type ? (priced ? 'offer-price' : 'offer-pricing-model') : 'offer-detail-offer_type',
    },
    { key: 'includes', label: 'At least one included item', done: strings(offer.includes).length > 0, step: STEP.offer, focusId: 'offer-includes' },
    { key: 'max_guests', label: 'Maximum guests', done: (offer.max_guests ?? 0) >= 1, step: STEP.offer, focusId: 'offer-max-guests' },
    {
      key: 'availability',
      label: 'Availability (days or confirm each booking)',
      done: hasDays || a.confirm_each === true,
      step: STEP.availability,
      focusId: 'offer-availability',
    },
    { key: 'pitch', label: 'Why you (your pitch)', done: !!offer.pitch?.trim(), step: STEP.pitch, focusId: 'offer-pitch' },
  )
  return items
}
