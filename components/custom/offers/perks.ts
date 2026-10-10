// Birthday-perk logic: option values, category defaults, display wording and the
// rules that generate the offer's title/description/includes from the perks step.
// Labels come from PERK_OPTIONS in sectionCopy.ts.

import type { CategoryKind } from './categoryFields'
import { PERK_OPTIONS } from './sectionCopy'

export type OfferType = 'free' | 'discount' | 'bogo' | 'perk'
export type DiscountType = 'percent' | 'dollar'
export type MonthlyChoice = '5' | '10' | '25' | 'custom' | 'unlimited' | 'confirm_each'

export const OFFER_TYPE_VALUES: OfferType[] = ['free', 'discount', 'bogo', 'perk']
export const MONTHLY_PRESETS = [5, 10, 25] as const

// details keys written by the perks step (and auto-generation bookkeeping).
export const PERK_DETAIL_KEYS = [
  'offer_type', 'discount_type', 'discount_value', 'applies_to', 'eligible',
  'monthly_limit', 'monthly_limit_label', 'auto_fields',
] as const

export function isOfferType(value: unknown): value is OfferType {
  return typeof value === 'string' && (OFFER_TYPE_VALUES as string[]).includes(value)
}

const label = <T extends { value: string; label: string }>(list: readonly T[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value

export const offerTypeLabel = (v: string) => label(PERK_OPTIONS.offerTypes, v)
export const appliesToLabel = (v: string) => label(PERK_OPTIONS.appliesTo, v)
export const eligibleLabel = (v: string) => label(PERK_OPTIONS.eligible, v)

// Pre-selected "What does it apply to" for a new offer.
export function defaultAppliesTo(kind: CategoryKind): string[] {
  if (kind === 'venue') return ['item']
  if (kind === 'photo' || kind === 'beauty' || kind === 'transport') return ['service']
  return []
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// "20% off" / "$10 off".
export function discountTerms(type: string | null | undefined, value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  if (type === 'percent') return `${formatAmount(value)}% off`
  if (type === 'dollar') return `$${formatAmount(value)} off`
  return null
}

export function monthlyLimitWording(limit: number | null | undefined, limitLabel: string | null | undefined): string | null {
  if (limitLabel === 'unlimited') return PERK_OPTIONS.monthly.unlimited
  if (limitLabel === 'confirm_each') return PERK_OPTIONS.monthly.confirmEach
  if (limit != null && limit >= 1) return `${limit} ${PERK_OPTIONS.monthly.perMonth}`
  return null
}

// ─── Generation ──────────────────────────────────────────────────────────────

// {thing} in titles / descriptions, from the first applies_to value (option order).
const THING: Record<string, { title: string; text: string }> = {
  item: { title: 'Item', text: 'item' },
  service: { title: 'Service', text: 'service' },
  space: { title: 'Space', text: 'space' },
  admission: { title: 'Admission', text: 'admission' },
  entire_order: { title: 'Order', text: 'order' },
}

function firstApplies(appliesTo: string[]): string | null {
  return PERK_OPTIONS.appliesTo.map((o) => o.value).find((v) => appliesTo.includes(v)) ?? null
}

export interface PerkAnswers {
  offerType: OfferType | null
  discountType: DiscountType | null
  discountValue: number | null
  appliesTo: string[]
  eligible: string[]
}

export function generateTitle(a: PerkAnswers): string | null {
  if (!a.offerType) return null
  const applies = firstApplies(a.appliesTo)
  const thing = applies ? THING[applies].title : 'Treat'
  let title: string | null = null
  switch (a.offerType) {
    case 'free':
      title = `Free Birthday ${thing}`
      break
    case 'discount': {
      if (a.discountValue == null) return null
      const amount = formatAmount(a.discountValue)
      title = a.discountType === 'dollar' ? `$${amount} Off Birthday ${thing}` : `${amount}% Off Birthday ${thing}`
      break
    }
    case 'bogo':
      title = 'Birthday BOGO'
      break
    case 'perk':
      title = 'Birthday Perk'
      break
  }
  return title.slice(0, 80)
}

const WHO: Record<string, string> = {
  birthday_person: 'the birthday person',
  birthday_crew: 'the birthday crew',
  couples: 'couples',
  family: 'families',
}

const ALSO: Record<string, string> = {
  birthday_person: 'Made for the person celebrating.',
  birthday_crew: 'Great for birthday crews celebrating together.',
  couples: 'Perfect for a birthday date.',
  family: 'Family-friendly, too.',
}

// One or two plain sentences, e.g. "Free birthday item for the birthday person.
// Great for birthday crews celebrating together."
export function generateDescription(a: PerkAnswers): string | null {
  if (!a.offerType) return null
  const applies = firstApplies(a.appliesTo)
  const thing = applies ? THING[applies].text : 'treat'
  const order = PERK_OPTIONS.eligible.map((o) => o.value).filter((v) => a.eligible.includes(v))
  const who = order[0] ? WHO[order[0]] : 'the birthday person'

  let first: string
  switch (a.offerType) {
    case 'free':
      first = `Free birthday ${thing} for ${who}.`
      break
    case 'discount': {
      const terms = discountTerms(a.discountType, a.discountValue) ?? 'A discount'
      first = `${terms.charAt(0).toUpperCase()}${terms.slice(1)} a birthday ${thing} for ${who}.`
      break
    }
    case 'bogo':
      first = `Buy one, get one on a birthday ${thing} for ${who}.`
      break
    case 'perk':
      first = `A special birthday ${thing} perk for ${who}.`
      break
  }
  const second = order[1] ? ALSO[order[1]] : null
  return (second ? `${first} ${second}` : first).slice(0, 300)
}

// includes entries generated from applies_to (option labels).
export function generatedIncludes(appliesTo: string[]): string[] {
  return PERK_OPTIONS.appliesTo.filter((o) => appliesTo.includes(o.value)).map((o) => o.label)
}
