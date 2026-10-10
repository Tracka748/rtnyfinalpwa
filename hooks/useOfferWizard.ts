'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { OfferRecord, PartnerSummary } from '@/components/custom/offers/types'
import { PRICED_MODELS } from '@/components/custom/offers/types'
import {
  DURATION_OPTIONS,
  LEGACY_NOTE_KEYS,
  NOTICE_OPTIONS,
  categoryTravels,
  configForCategory,
  durationLabelForHours,
  noticeLabelForHours,
  type CategoryConfig,
} from '@/components/custom/offers/categoryFields'
import { parseMoney } from '@/components/custom/offers/MoneyInput'
import type { BannerState } from '@/components/custom/offers/FormBanner'
import { messageForStatus, patchOffer, type OfferAction } from '@/components/custom/offers/offerApi'
import {
  MONTHLY_PRESETS,
  PERK_DETAIL_KEYS,
  defaultAppliesTo,
  generateDescription,
  generateTitle,
  generatedIncludes,
  isOfferType,
  type DiscountType,
  type MonthlyChoice,
  type OfferType,
  type PerkAnswers,
} from '@/components/custom/offers/perks'

export const WIZARD_STEPS = [
  'Welcome', 'Category', 'Birthday perks', 'Fine-tune offer', 'Add-ons', 'Availability', 'Why you', 'Photos & review',
]

export const STEP = {
  welcome: 1,
  category: 2,
  perks: 3,
  offer: 4,
  addOns: 5,
  availability: 6,
  pitch: 7,
  review: 8,
} as const

const LAST_STEP = WIZARD_STEPS.length

// ─── Form shape ───────────────────────────────────────────────────────────────

export type RequirementValue = string | string[]

export interface CustomAddOn {
  // Stable id for React keys and error/DOM ids (not saved).
  id: string
  name: string
  // Raw money text.
  price: string
}

export interface OfferForm {
  // Step 3: birthday perks (saved in details). discountValue / monthlyCustom are raw text.
  offerType: OfferType | null
  discountType: DiscountType | null
  discountValue: string
  appliesTo: string[]
  eligible: string[]
  monthlyChoice: MonthlyChoice | null
  monthlyCustom: string
  // 'perks' prices the offer from offerType; 'fixed' shows the Flat/Per person/… controls.
  pricingMode: 'perks' | 'fixed'
  // Fields last filled by auto-generation (details.auto_fields). Hand edits remove them.
  autoFields: string[]
  title: string
  description: string
  pricingModel: string | null
  // Raw text so partial input ("12.") survives typing.
  price: string
  // Selected preset chips (canonical labels) and partner-typed extras; both save to `includes`.
  includePresets: string[]
  customIncludes: string[]
  minGuests: number | null
  maxGuests: number | null
  durationLabel: string | null
  noticeLabel: string | null
  // Additional requirements keyed by RequirementField.key. Numbers are kept as strings.
  requirements: Record<string, RequirementValue>
  // Step 4: selected preset add-ons (name → raw price) and custom ones; both save to `add_ons`.
  addOnPresets: Record<string, string>
  customAddOns: CustomAddOn[]
  // Step 5: availability.*
  days: number[]
  startTime: string | null // HH:MM
  endTime: string | null // HH:MM, may be earlier than start (late nights)
  blackoutDates: string[] // YYYY-MM-DD
  radiusMiles: number | null
  confirmEach: boolean
  // Step 6
  pitch: string
  // Step 7
  offerImageUrl: string | null
  galleryUrls: string[]
}

// Keys match API field names; requirement fields use `details.<key>`, add-ons `add_ons.<id>`.
export type FieldErrors = Record<string, string>

const EMPTY_FORM: OfferForm = {
  offerType: null,
  discountType: null,
  discountValue: '',
  appliesTo: [],
  eligible: [],
  monthlyChoice: null,
  monthlyCustom: '',
  pricingMode: 'perks',
  autoFields: [],
  title: '',
  description: '',
  pricingModel: null,
  price: '',
  includePresets: [],
  customIncludes: [],
  minGuests: null,
  maxGuests: null,
  durationLabel: null,
  noticeLabel: null,
  requirements: {},
  addOnPresets: {},
  customAddOns: [],
  days: [],
  startTime: null,
  endTime: null,
  blackoutDates: [],
  radiusMiles: null,
  confirmEach: false,
  pitch: '',
  offerImageUrl: null,
  galleryUrls: [],
}

// Mirrors app/api/v1/partners/[id]/offers/_shared.ts (description is capped lower in the UI).
export const LIMITS = {
  title: 80,
  description: 300,
  includesItems: 20,
  includesItemLength: 100,
  detailsKeys: 30,
  discountPercent: 100,
  detailListItems: 12,
  addOns: 10,
  addOnName: 60,
  pitch: 300,
  gallery: 6,
  blackoutDates: 366,
} as const

const PRICING_MODELS = new Set(['free', 'flat', 'per_person', 'starting_at', 'contact', 'discount', 'bogo', 'perk'])
const STEP_DETAIL_KEYS = ['duration_label', 'notice_label', ...PERK_DETAIL_KEYS]
// Form keys whose hand edits stop auto-generation for that field.
const AUTO_FIELD_FOR: Partial<Record<keyof OfferForm, string>> = {
  title: 'title',
  description: 'description',
  includePresets: 'includes',
  customIncludes: 'includes',
}
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function addOnSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

let customSeq = 0
export function newCustomAddOnId(): string {
  customSeq += 1
  return `custom-${customSeq}`
}

function formFromOffer(offer: OfferRecord, config: CategoryConfig): OfferForm {
  const details = isPlainObject(offer.details) ? offer.details : {}

  const presetByLower = new Map(config.includePresets.map((p) => [p.toLowerCase(), p]))
  const includePresets: string[] = []
  const customIncludes: string[] = []
  for (const item of stringList(offer.includes)) {
    const preset = presetByLower.get(item.trim().toLowerCase())
    if (preset) {
      if (!includePresets.includes(preset)) includePresets.push(preset)
    } else {
      customIncludes.push(item)
    }
  }

  const requirements: Record<string, RequirementValue> = {}
  for (const field of config.requirements?.fields ?? []) {
    const v = details[field.key]
    if (field.kind === 'multi') {
      const list = stringList(v)
      if (list.length) requirements[field.key] = list
    } else if (typeof v === 'number' || typeof v === 'string') {
      requirements[field.key] = String(v)
    }
  }

  // Add-ons: names matching this category's presets become preset chips; the rest are custom.
  const addOnPresetByLower = new Map(config.addOnPresets.map((p) => [p.toLowerCase(), p]))
  const addOnPresets: Record<string, string> = {}
  const customAddOns: CustomAddOn[] = []
  for (const item of Array.isArray(offer.add_ons) ? offer.add_ons : []) {
    if (!isPlainObject(item) || typeof item.name !== 'string') continue
    const price = typeof item.price === 'number' ? String(item.price) : ''
    const preset = addOnPresetByLower.get(item.name.trim().toLowerCase())
    if (preset && !(preset in addOnPresets)) addOnPresets[preset] = price
    else customAddOns.push({ id: newCustomAddOnId(), name: item.name, price })
  }

  const availability = isPlainObject(offer.availability) ? offer.availability : {}
  const days = Array.isArray(availability.days)
    ? availability.days.filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6)
    : []
  const time = (v: unknown) => (typeof v === 'string' && TIME_RE.test(v) ? v : null)

  const savedDuration = typeof details.duration_label === 'string' ? details.duration_label : null
  const savedNotice = typeof details.notice_label === 'string' ? details.notice_label : null

  // Birthday perks. Drafts made before the perks step have no offer_type and stay on fixed pricing.
  const offerType = isOfferType(details.offer_type) ? details.offer_type : null
  const discountType = details.discount_type === 'percent' || details.discount_type === 'dollar' ? details.discount_type : null
  const monthlyLimit = typeof details.monthly_limit === 'number' ? details.monthly_limit : null
  let monthlyChoice: MonthlyChoice | null = null
  let monthlyCustom = ''
  if (details.monthly_limit_label === 'unlimited' || details.monthly_limit_label === 'confirm_each') {
    monthlyChoice = details.monthly_limit_label
  } else if (monthlyLimit !== null && monthlyLimit >= 1) {
    if ((MONTHLY_PRESETS as readonly number[]).includes(monthlyLimit)) monthlyChoice = String(monthlyLimit) as MonthlyChoice
    else {
      monthlyChoice = 'custom'
      monthlyCustom = String(monthlyLimit)
    }
  }

  return {
    offerType,
    discountType,
    discountValue: typeof details.discount_value === 'number' ? String(details.discount_value) : '',
    appliesTo: stringList(details.applies_to),
    eligible: stringList(details.eligible),
    monthlyChoice,
    monthlyCustom,
    pricingMode: offerType ? 'perks' : 'fixed',
    autoFields: stringList(details.auto_fields),
    title: offer.title ?? '',
    description: offer.description ?? '',
    pricingModel: offer.pricing_model && PRICING_MODELS.has(offer.pricing_model) ? offer.pricing_model : null,
    price: offer.pricing_model && PRICED_MODELS.has(offer.pricing_model) && offer.price > 0 ? String(offer.price) : '',
    includePresets,
    customIncludes,
    minGuests: offer.min_guests,
    maxGuests: offer.max_guests,
    durationLabel: DURATION_OPTIONS.some((o) => o.label === savedDuration)
      ? savedDuration
      : durationLabelForHours(offer.duration_hours),
    noticeLabel: NOTICE_OPTIONS.some((o) => o.label === savedNotice)
      ? savedNotice
      : noticeLabelForHours(offer.advance_notice_hours),
    requirements,
    addOnPresets,
    customAddOns,
    days,
    startTime: time(availability.start_time),
    endTime: time(availability.end_time),
    blackoutDates: stringList(availability.blackout_dates).filter((d) => DATE_RE.test(d)),
    radiusMiles: typeof availability.radius_miles === 'number' ? availability.radius_miles : null,
    confirmEach: availability.confirm_each === true,
    pitch: offer.pitch ?? '',
    offerImageUrl: offer.offer_image_url,
    galleryUrls: offer.gallery_urls ?? [],
  }
}

// ─── Field labels, order, steps and DOM ids (banner + focus) ─────────────────

// Step 3 (birthday perks) fields; errors use these keys and live in details.
const PERK_FIELD_ORDER: [string, string][] = [
  ['details.offer_type', 'Offer type'],
  ['details.discount_type', 'Discount type'],
  ['details.discount_value', 'Discount amount'],
  ['details.applies_to', 'Applies to'],
  ['details.eligible', 'Who is eligible'],
  ['details.monthly_limit', 'Monthly limit'],
]
const PERK_FIELD_KEYS = new Set(PERK_FIELD_ORDER.map(([k]) => k))

const BASE_FIELD_ORDER: [string, string][] = [
  ['title', 'Offer name'],
  ['description', 'Short description'],
  ['pricing_model', 'Pricing'],
  ['price', 'Price'],
  ['includes', 'What’s included'],
  ['min_guests', 'Min guests'],
  ['max_guests', 'Max guests'],
  ['duration_hours', 'Duration'],
  ['advance_notice_hours', 'Advance notice'],
  ['details', 'Additional requirements'],
]

const LATER_FIELD_ORDER: [string, string][] = [
  ['availability', 'Availability'],
  ['pitch', 'Why you'],
  ['offer_image_url', 'Cover photo'],
  ['gallery_urls', 'Gallery photos'],
]

const BASE_DOM_IDS: Record<string, string> = {
  title: 'offer-title',
  description: 'offer-description',
  pricing_model: 'offer-pricing-model',
  price: 'offer-price',
  includes: 'offer-includes',
  min_guests: 'offer-min-guests',
  max_guests: 'offer-max-guests',
  duration_hours: 'offer-duration',
  advance_notice_hours: 'offer-advance-notice',
  details: 'offer-requirements',
  add_ons: 'offer-addons',
  availability: 'offer-availability',
  pitch: 'offer-pitch',
  offer_image_url: 'offer-photos',
  gallery_urls: 'offer-photos',
}

export function fieldDomId(key: string): string {
  if (key.startsWith('details.')) return `offer-detail-${key.slice('details.'.length)}`
  if (key.startsWith('add_ons.')) return `offer-addon-${key.slice('add_ons.'.length)}`
  return BASE_DOM_IDS[key] ?? key
}

// Which wizard step shows a field, so a failed save can jump there.
export function stepForField(key: string): number {
  if (PERK_FIELD_KEYS.has(key)) return STEP.perks
  if (key.startsWith('add_ons')) return STEP.addOns
  if (key.startsWith('availability')) return STEP.availability
  if (key === 'pitch') return STEP.pitch
  if (key === 'offer_image_url' || key === 'gallery_urls') return STEP.review
  return STEP.offer
}

function fieldOrder(config: CategoryConfig, form: OfferForm): [string, string][] {
  return [
    ...PERK_FIELD_ORDER,
    ...BASE_FIELD_ORDER,
    ...(config.requirements?.fields ?? []).map((f): [string, string] => [`details.${f.key}`, f.label]),
    ['add_ons', 'Add-ons'],
    ...config.addOnPresets.map((name): [string, string] => [`add_ons.${addOnSlug(name)}`, `${name} price`]),
    ...form.customAddOns.map((c, i): [string, string] => [`add_ons.${c.id}`, c.name.trim() || `Add-on ${i + 1}`]),
    ...LATER_FIELD_ORDER,
  ]
}

// ─── Validation (client mirror of the API) ───────────────────────────────────

export interface OfferPayload {
  title: string
  description: string | null
  pricing_model: string | null
  price?: number
  includes: string[]
  min_guests: number | null
  max_guests: number | null
  duration_hours: number | null
  advance_notice_hours: number | null
  details: Record<string, string | number | string[]>
  add_ons: { name: string; price: number }[]
  availability: Record<string, unknown>
  pitch: string | null
  offer_image_url?: string | null
  gallery_urls?: string[]
}

function parseDiscountValue(form: OfferForm): number | null | 'invalid' {
  const raw = form.discountValue.trim()
  if (!raw) return null
  if (form.discountType === 'percent') {
    if (!/^\d+$/.test(raw)) return 'invalid'
    const n = Number(raw)
    return n >= 1 && n <= LIMITS.discountPercent ? n : 'invalid'
  }
  const n = parseMoney(raw)
  return n !== null && n > 0 ? n : 'invalid'
}

function parseMonthlyCustom(form: OfferForm): number | null | 'invalid' {
  const raw = form.monthlyCustom.trim()
  if (!raw) return null
  return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : 'invalid'
}

// The pricing model actually saved: the offer type while using birthday perks,
// otherwise the fixed-price choice.
function effectiveModel(form: OfferForm): string | null {
  return form.pricingMode === 'perks' && form.offerType ? form.offerType : form.pricingModel
}

// Writes the perks-step answers into details (format checks only; completeness is
// checked by validatePerks on the perks step and by the API on submit).
function writePerkDetails(form: OfferForm, details: Record<string, string | number | string[]>, errors: FieldErrors) {
  const model = effectiveModel(form)
  if (form.pricingMode === 'perks' && form.offerType) details.offer_type = form.offerType
  // A fixed "Free" price is the same thing as a Free perk, so it satisfies offer_type on submit.
  else if (form.pricingMode === 'fixed' && model === 'free') details.offer_type = 'free'

  if (details.offer_type === 'discount') {
    if (form.discountType) details.discount_type = form.discountType
    const value = parseDiscountValue(form)
    if (value === 'invalid') {
      errors['details.discount_value'] =
        form.discountType === 'percent' ? `Enter a whole number from 1 to ${LIMITS.discountPercent}.` : 'Enter an amount above $0.'
    } else if (value !== null) {
      details.discount_value = value
    }
  }

  if (form.appliesTo.length) details.applies_to = form.appliesTo.slice(0, LIMITS.detailListItems)
  if (form.eligible.length) details.eligible = form.eligible.slice(0, LIMITS.detailListItems)

  switch (form.monthlyChoice) {
    case '5':
    case '10':
    case '25':
      details.monthly_limit = Number(form.monthlyChoice)
      break
    case 'custom': {
      const n = parseMonthlyCustom(form)
      if (n === 'invalid') errors['details.monthly_limit'] = 'Enter a whole number of 1 or more.'
      else if (n !== null) details.monthly_limit = n
      break
    }
    case 'unlimited':
    case 'confirm_each':
      details.monthly_limit_label = form.monthlyChoice
      break
  }

  if (form.autoFields.length) details.auto_fields = [...new Set(form.autoFields)]
}

function buildPayload(
  form: OfferForm,
  config: CategoryConfig,
  offer: OfferRecord | null,
  travels: boolean
): { errors: FieldErrors; payload: OfferPayload | null } {
  const errors: FieldErrors = {}

  const title = form.title.trim()
  if (!title) errors.title = 'Give your offer a name.'
  else if (title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`

  const description = form.description.trim()
  if (description.length > LIMITS.description) errors.description = `Keep it under ${LIMITS.description} characters.`

  const model = effectiveModel(form)
  if (model !== null && !PRICING_MODELS.has(model)) errors.pricing_model = 'Pick how this is priced.'

  let price: number | undefined
  if (model && PRICED_MODELS.has(model)) {
    const parsed = parseMoney(form.price)
    if (parsed === null || parsed <= 0) errors.price = 'Add a price, or choose Free or Contact us.'
    else price = parsed
  }

  const includes = [...form.includePresets, ...form.customIncludes.map((i) => i.trim()).filter(Boolean)]
  if (includes.length > LIMITS.includesItems) errors.includes = `Pick up to ${LIMITS.includesItems} items.`
  else if (includes.some((i) => i.length > LIMITS.includesItemLength)) {
    errors.includes = `Each item must be under ${LIMITS.includesItemLength} characters.`
  }

  if (form.minGuests !== null && form.maxGuests !== null && form.minGuests > form.maxGuests) {
    errors.max_guests = 'Max guests must be at least the minimum.'
  }

  // Keep every details key this step doesn't own (legacy notes, later steps).
  const ownedKeys = new Set([...STEP_DETAIL_KEYS, ...(config.requirements?.fields.map((f) => f.key) ?? [])])
  const details: Record<string, string | number | string[]> = {}
  if (isPlainObject(offer?.details)) {
    for (const [k, v] of Object.entries(offer.details)) {
      if (ownedKeys.has(k)) continue
      if (typeof v === 'string' || typeof v === 'number') details[k] = v
      else if (Array.isArray(v)) details[k] = stringList(v)
    }
  }
  if (form.durationLabel) details.duration_label = form.durationLabel
  if (form.noticeLabel) details.notice_label = form.noticeLabel
  writePerkDetails(form, details, errors)

  for (const field of config.requirements?.fields ?? []) {
    const raw = form.requirements[field.key]
    const errKey = `details.${field.key}`
    if (raw === undefined) continue
    switch (field.kind) {
      case 'money': {
        if (typeof raw !== 'string' || raw.trim() === '') break
        const n = parseMoney(raw)
        if (n === null || n < 0) errors[errKey] = 'Enter an amount of 0 or more.'
        else details[field.key] = n
        break
      }
      case 'number':
        if (typeof raw === 'string' && raw !== '') details[field.key] = Number(raw)
        break
      case 'choice':
        if (typeof raw === 'string' && raw) details[field.key] = raw
        break
      case 'multi':
        if (Array.isArray(raw) && raw.length > 0) {
          if (raw.length > LIMITS.detailListItems) errors[errKey] = `Pick up to ${LIMITS.detailListItems}.`
          else details[field.key] = raw
        }
        break
      case 'note': {
        const text = typeof raw === 'string' ? raw.trim() : ''
        if (text.length > field.maxLength) errors[errKey] = `Keep it under ${field.maxLength} characters.`
        else if (text) details[field.key] = text
        break
      }
    }
  }
  if (Object.keys(details).length > LIMITS.detailsKeys) errors.details = 'Too many extra details on this offer.'

  // ── Add-ons (step 4): every selected add-on needs a price ──
  const addOns: { name: string; price: number }[] = []
  const seen = new Set<string>()
  for (const name of config.addOnPresets) {
    if (!(name in form.addOnPresets)) continue
    const p = parseMoney(form.addOnPresets[name])
    if (p === null || p < 0) errors[`add_ons.${addOnSlug(name)}`] = 'Add a price for this add-on.'
    else addOns.push({ name, price: p })
    seen.add(name.toLowerCase())
  }
  for (const c of form.customAddOns) {
    const key = `add_ons.${c.id}`
    const name = c.name.trim()
    const p = parseMoney(c.price)
    if (!name) errors[key] = 'Name this add-on, or remove it.'
    else if (name.length > LIMITS.addOnName) errors[key] = `Keep the name under ${LIMITS.addOnName} characters.`
    else if (seen.has(name.toLowerCase())) errors[key] = 'You already added this one.'
    else if (p === null || p < 0) errors[key] = 'Add a price for this add-on.'
    else addOns.push({ name, price: p })
    seen.add(name.toLowerCase())
  }
  if (form.customAddOns.length + Object.keys(form.addOnPresets).length > LIMITS.addOns) {
    errors.add_ons = `Up to ${LIMITS.addOns} add-ons.`
  }

  // ── Availability (step 5): replace the keys this wizard owns, keep the rest ──
  const availability: Record<string, unknown> = isPlainObject(offer?.availability) ? { ...offer.availability } : {}
  availability.days = [...new Set(form.days)].sort((a, b) => a - b)
  availability.start_time = form.startTime
  availability.end_time = form.endTime
  availability.blackout_dates = [...new Set(form.blackoutDates)].sort()
  availability.confirm_each = form.confirmEach
  if (travels) availability.radius_miles = form.radiusMiles
  if (form.blackoutDates.length > LIMITS.blackoutDates) {
    errors.availability = `Up to ${LIMITS.blackoutDates} blackout dates.`
  }

  // ── Pitch (step 6) ──
  const pitch = form.pitch.trim()
  if (pitch.length > LIMITS.pitch) errors.pitch = `Keep it under ${LIMITS.pitch} characters.`

  if (Object.keys(errors).length > 0) return { errors, payload: null }

  const duration = DURATION_OPTIONS.find((o) => o.label === form.durationLabel)
  const notice = NOTICE_OPTIONS.find((o) => o.label === form.noticeLabel)

  return {
    errors,
    payload: {
      title,
      description: description || null,
      pricing_model: model,
      ...(price !== undefined ? { price } : {}),
      includes,
      min_guests: form.minGuests,
      max_guests: form.maxGuests,
      duration_hours: duration?.hours ?? null,
      advance_notice_hours: notice?.hours ?? null,
      details,
      add_ons: addOns,
      availability,
      pitch: pitch || null,
      // Image URLs include the offer id, so the API only accepts them once the offer exists.
      ...(offer ? { offer_image_url: form.offerImageUrl, gallery_urls: form.galleryUrls } : {}),
    },
  }
}

// ─── Birthday perks: validation + auto-generation ────────────────────────────

// Required answers for Continue on the perks step. Offer type is optional while the
// offer uses a fixed price (picking one switches back to perks).
export function validatePerks(form: OfferForm): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.offerType && form.pricingMode === 'perks') errors['details.offer_type'] = 'Pick the kind of perk you’ll offer.'
  if (form.offerType === 'discount') {
    if (!form.discountType) errors['details.discount_type'] = 'Choose percent or dollar amount.'
    const value = parseDiscountValue(form)
    if (value === null) errors['details.discount_value'] = 'Enter the discount amount.'
    else if (value === 'invalid') {
      errors['details.discount_value'] =
        form.discountType === 'percent' ? `Enter a whole number from 1 to ${LIMITS.discountPercent}.` : 'Enter an amount above $0.'
    }
  }
  if (!form.appliesTo.length) errors['details.applies_to'] = 'Pick at least one.'
  if (!form.eligible.length) errors['details.eligible'] = 'Pick at least one.'
  if (!form.monthlyChoice) errors['details.monthly_limit'] = 'Choose a monthly limit.'
  else if (form.monthlyChoice === 'custom' && typeof parseMonthlyCustom(form) !== 'number') {
    errors['details.monthly_limit'] = 'Enter a whole number of 1 or more.'
  }
  return errors
}

function perkAnswers(form: OfferForm): PerkAnswers {
  const value = parseDiscountValue(form)
  return {
    offerType: form.offerType,
    discountType: form.discountType,
    discountValue: typeof value === 'number' ? value : null,
    appliesTo: form.appliesTo,
    eligible: form.eligible,
  }
}

// Fills title, description, includes and pricing from the perks answers. A field is
// only (re)generated when it's empty or still holds an earlier generated value
// (listed in autoFields); anything the partner typed by hand is left alone.
export function applyGeneration(form: OfferForm, config: CategoryConfig): OfferForm {
  const next: OfferForm = { ...form }
  const auto = new Set(form.autoFields)
  const answers = perkAnswers(form)
  const canFill = (field: string, current: boolean) => !current || auto.has(field)

  // Choosing an offer type means pricing comes from the perk.
  if (form.offerType) {
    next.pricingMode = 'perks'
    next.pricingModel = form.offerType
    next.price = ''
  }

  const title = generateTitle(answers)
  if (title && canFill('title', !!form.title.trim())) {
    next.title = title
    auto.add('title')
  }

  const description = generateDescription(answers)
  if (description && canFill('description', !!form.description.trim())) {
    next.description = description
    auto.add('description')
  }

  const currentIncludes = [...form.includePresets, ...form.customIncludes]
  if (canFill('includes', currentIncludes.length > 0)) {
    const have = new Set(currentIncludes.map((i) => i.toLowerCase()))
    const presetByLower = new Map(config.includePresets.map((p) => [p.toLowerCase(), p]))
    const room = LIMITS.includesItems - currentIncludes.length
    const toAdd = generatedIncludes(form.appliesTo).filter((i) => !have.has(i.toLowerCase())).slice(0, Math.max(0, room))
    next.includePresets = [...form.includePresets, ...toAdd.flatMap((i) => presetByLower.get(i.toLowerCase()) ?? [])]
    next.customIncludes = [...form.customIncludes, ...toAdd.filter((i) => !presetByLower.has(i.toLowerCase()))]
    if (toAdd.length || auto.has('includes')) auto.add('includes')
  }

  next.autoFields = [...auto]
  return next
}

// ─── API error mapping ────────────────────────────────────────────────────────

const API_FIELDS = new Set([
  'title', 'price', 'description', 'pricing_model', 'includes', 'min_guests', 'max_guests',
  'duration_hours', 'advance_notice_hours', 'details', 'add_ons', 'availability', 'pitch',
  'offer_image_url', 'gallery_urls',
])

const FRIENDLY_API_MESSAGES: [RegExp, string][] = [
  [/^price is required/, 'Add a price, or choose Free or Contact us.'],
  [/^pricing_model must be one of/, 'Pick how this is priced.'],
  [/^min_guests must be <= max_guests/, 'Minimum can’t be more than the maximum.'],
  [/^(offer_image_url|gallery_urls)/, 'Upload photos with the button here instead of pasting a link.'],
]

// API 400 messages start with the field name, e.g. "title must be 1-80 characters",
// "each includes item must be 1-100 characters", "details.food_drink may have at most 12 items",
// "each add_on name must be 1-60 characters" or "availability.days must be …".
export function mapApiError(message: string): { field: string; message: string } | null {
  const match = message.match(/^(?:each\s+)?([a-z_]+(?:\.[a-z0-9_]+)?)(?:\s+item)?\s+(.*)$/)
  if (!match) return null
  let field = match[1]
  if (field === 'add_on') field = 'add_ons'
  const base = field.split('.')[0]
  if (!API_FIELDS.has(base)) return null
  // Only details.* keeps its sub-key (each detail is its own field); others map to the base field.
  if (field.includes('.') && base !== 'details') field = base
  const friendly = FRIENDLY_API_MESSAGES.find(([re]) => re.test(message))?.[1]
  const rest = match[2]
  return { field, message: friendly ?? `${rest.charAt(0).toUpperCase()}${rest.slice(1)}.` }
}

// Submit 400s look like "Missing required fields: pricing_model, includes, pitch".
const SUBMIT_FIELD_KEYS: Record<string, string> = {
  offer_type: 'details.offer_type',
  discount_type: 'details.discount_type',
  discount_value: 'details.discount_value',
  applies_to: 'details.applies_to',
  eligible: 'details.eligible',
  monthly_limit: 'details.monthly_limit',
  title: 'title',
  pricing_model: 'pricing_model',
  price: 'price',
  includes: 'includes',
  max_guests: 'max_guests',
  pitch: 'pitch',
  availability: 'availability',
}

export function parseMissingFields(message: string): string[] | null {
  const match = message.match(/^Missing required fields:\s*(.+)$/)
  if (!match) return null
  return match[1]
    .split(',')
    .map((f) => SUBMIT_FIELD_KEYS[f.trim()])
    .filter((f): f is string => !!f)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOfferWizardArgs {
  partnerId: string
  offerId: string | null
}

export function useOfferWizard({ partnerId, offerId }: UseOfferWizardArgs) {
  const [step, setStep] = useState<number>(STEP.welcome)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [partner, setPartner] = useState<PartnerSummary | null>(null)
  const [offer, setOffer] = useState<OfferRecord | null>(null)
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  // Non-field problems (auth, conflicts, network) and success notes. Field problems come from fieldErrors.
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [imageSaving, setImageSaving] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // Bumped when validation fails so the view can focus the first invalid field.
  const [focusToken, setFocusToken] = useState(0)

  // Id of the offer already in state, so updating ?offer= after a create
  // doesn't trigger a reload.
  const currentOfferIdRef = useRef<string | null>(null)

  const config = useMemo(() => configForCategory(partner?.categoryName), [partner?.categoryName])
  const travels = useMemo(() => categoryTravels(partner?.categoryName), [partner?.categoryName])
  const order = useMemo(() => fieldOrder(config, form), [config, form])

  // Ordered list of fields that currently have an error, for the banner and focus.
  const invalidFields = useMemo(() => {
    const known = order.filter(([key]) => fieldErrors[key]).map(([key, label]) => ({ key, label }))
    const knownKeys = new Set(known.map((f) => f.key))
    const extra = Object.keys(fieldErrors)
      .filter((k) => !knownKeys.has(k))
      .map((key) => ({ key, label: key }))
    return [...known, ...extra]
  }, [order, fieldErrors])

  const legacyNotes = useMemo(() => {
    const details = isPlainObject(offer?.details) ? offer.details : {}
    return Object.entries(LEGACY_NOTE_KEYS)
      .filter(([key]) => typeof details[key] === 'string' && (details[key] as string).trim())
      .map(([key, label]) => ({ key, label, value: details[key] as string }))
  }, [offer?.details])

  useEffect(() => {
    if (offerId && offerId === currentOfferIdRef.current) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const supabase = createBrowserSupabaseClient()
        const offersRequest = offerId ? fetch(`/api/v1/partners/${partnerId}/offers`) : null

        const { data: partnerRow, error: partnerError } = await supabase
          .from('partners')
          .select('id, display_name, category, partner_categories(name)')
          .eq('id', partnerId)
          .maybeSingle()

        if (cancelled) return
        if (partnerError || !partnerRow) {
          setLoadError('We couldn’t find this partner.')
          return
        }

        const joined = partnerRow.partner_categories as { name: string } | { name: string }[] | null
        const joinedName = Array.isArray(joined) ? joined[0]?.name : joined?.name
        const categoryName = joinedName ?? partnerRow.category ?? null
        setPartner({ id: partnerRow.id, displayName: partnerRow.display_name, categoryName })

        // New offer: pre-select what the perk applies to from the category.
        if (!offerId) {
          setForm({ ...EMPTY_FORM, appliesTo: defaultAppliesTo(configForCategory(categoryName).kind) })
        }

        if (offersRequest) {
          const res = await offersRequest
          const json = await res.json().catch(() => ({}))
          if (cancelled) return
          if (!res.ok) {
            setLoadError(messageForStatus(res.status, json.error, 'load'))
            return
          }
          const found = (json.data as OfferRecord[] | undefined)?.find((o) => o.id === offerId)
          if (!found) {
            setLoadError(messageForStatus(404, undefined, 'load'))
            return
          }
          currentOfferIdRef.current = found.id
          setOffer(found)
          const loaded = formFromOffer(found, configForCategory(categoryName))
          setForm(loaded)
          // Perk offers reopen on the perks step; older fixed-price drafts on the offer step.
          setStep(loaded.offerType ? STEP.perks : STEP.offer)
        }
      } catch {
        if (!cancelled) setLoadError('We couldn’t load this offer. Check your connection and try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [partnerId, offerId])

  const clearErrors = useCallback((...keys: string[]) => {
    setFieldErrors((e) => {
      if (!keys.some((k) => e[k])) return e
      const next = { ...e }
      for (const k of keys) delete next[k]
      return next
    })
  }, [])

  const updateField = useCallback(
    <K extends keyof OfferForm>(key: K, value: OfferForm[K], ...errorKeys: string[]) => {
      const autoField = AUTO_FIELD_FOR[key]
      setForm((f) => ({
        ...f,
        [key]: value,
        // A hand edit means auto-generation must leave this field alone from now on.
        ...(autoField && f.autoFields.includes(autoField) ? { autoFields: f.autoFields.filter((a) => a !== autoField) } : {}),
      }))
      if (errorKeys.length) clearErrors(...errorKeys)
    },
    [clearErrors]
  )

  // "Switch to a fixed price" clears the offer type and discount terms (kept aside so
  // switching back restores them); "Use birthday perks instead" brings them back.
  const stashedPerk = useRef<Pick<OfferForm, 'offerType' | 'discountType' | 'discountValue'> | null>(null)
  const switchPricingMode = useCallback(
    (mode: 'perks' | 'fixed') => {
      setForm((f) => {
        if (mode === f.pricingMode) return f
        if (mode === 'fixed') {
          stashedPerk.current = { offerType: f.offerType, discountType: f.discountType, discountValue: f.discountValue }
          return { ...f, pricingMode: 'fixed', offerType: null, discountType: null, discountValue: '', pricingModel: null, price: '' }
        }
        const restored = stashedPerk.current ?? { offerType: f.offerType, discountType: f.discountType, discountValue: f.discountValue }
        return { ...f, ...restored, pricingMode: 'perks', pricingModel: restored.offerType, price: '' }
      })
      clearErrors('pricing_model', 'price')
    },
    [clearErrors]
  )

  const setRequirement = useCallback(
    (key: string, value: RequirementValue) => {
      setForm((f) => ({ ...f, requirements: { ...f.requirements, [key]: value } }))
      clearErrors(`details.${key}`, 'details')
    },
    [clearErrors]
  )

  const goToStep = useCallback((target: number) => {
    setBanner(null)
    setStep(Math.min(Math.max(target, STEP.welcome), LAST_STEP))
  }, [])

  const goNext = useCallback(() => {
    setBanner(null)
    setStep((s) => Math.min(s + 1, LAST_STEP))
  }, [])

  const goBack = useCallback(() => {
    setBanner(null)
    setFieldErrors({})
    setStep((s) => Math.max(s - 1, STEP.welcome))
  }, [])

  // Shows field errors, jumps to the step holding the first one, and focuses it.
  const showFieldErrors = useCallback(
    (errors: FieldErrors) => {
      setFieldErrors(errors)
      const first = order.find(([key]) => errors[key])?.[0] ?? Object.keys(errors)[0]
      if (first) setStep(stepForField(first))
      setFocusToken((t) => t + 1)
    },
    [order]
  )

  const applySaved = useCallback(
    (saved: OfferRecord) => {
      currentOfferIdRef.current = saved.id
      setOffer(saved)
      setForm(formFromOffer(saved, config))
      setFieldErrors({})
    },
    [config]
  )

  // Creates the draft (POST) or saves edits (PATCH action 'save').
  // Returns the saved row, or null when validation or the request failed.
  const save = useCallback(async (formOverride?: OfferForm): Promise<OfferRecord | null> => {
    setBanner(null)
    const { errors, payload } = buildPayload(formOverride ?? form, config, offer, travels)
    if (!payload) {
      showFieldErrors(errors)
      return null
    }
    setFieldErrors({})

    setSaving(true)
    try {
      const base = `/api/v1/partners/${partnerId}/offers`
      const res = await fetch(offer ? `${base}/${offer.id}` : base, {
        method: offer ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer ? { action: 'save', ...payload } : payload),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const mapped = res.status === 400 && typeof json.error === 'string' ? mapApiError(json.error) : null
        if (mapped) showFieldErrors({ [mapped.field]: mapped.message })
        else setBanner({ type: 'error', message: messageForStatus(res.status, json.error, 'save') })
        return null
      }

      const saved = json.data as OfferRecord
      applySaved(saved)
      return saved
    } catch {
      setBanner({ type: 'error', message: messageForStatus(0, undefined, 'save') })
      return null
    } finally {
      setSaving(false)
    }
  }, [form, config, offer, travels, partnerId, showFieldErrors, applySaved])

  // Perks step Continue: check the answers, fill the offer from them, then save.
  const savePerks = useCallback(async (): Promise<OfferRecord | null> => {
    const errors = validatePerks(form)
    if (Object.keys(errors).length) {
      setBanner(null)
      showFieldErrors(errors)
      return null
    }
    const generated = applyGeneration(form, config)
    setForm(generated)
    return save(generated)
  }, [form, config, save, showFieldErrors])

  // Saves only the photo fields (step 8), right after an upload or removal.
  const saveImages = useCallback(
    async (next: { offerImageUrl: string | null; galleryUrls: string[] }): Promise<boolean> => {
      if (!offer) return false
      setBanner(null)
      setForm((f) => ({ ...f, ...next }))
      setImageSaving(true)
      const result = await patchOffer(partnerId, offer.id, {
        action: 'save',
        offer_image_url: next.offerImageUrl,
        gallery_urls: next.galleryUrls,
      })
      setImageSaving(false)
      if (!result.ok) {
        const mapped = result.status === 400 && result.error ? mapApiError(result.error) : null
        if (mapped) showFieldErrors({ [mapped.field]: mapped.message })
        else setBanner({ type: 'error', message: messageForStatus(result.status, result.error, 'save') })
        // Put the photos back the way the server has them.
        setForm((f) => ({ ...f, offerImageUrl: offer.offer_image_url, galleryUrls: offer.gallery_urls ?? [] }))
        return false
      }
      currentOfferIdRef.current = result.data.id
      setOffer(result.data)
      clearErrors('offer_image_url', 'gallery_urls')
      return true
    },
    [offer, partnerId, showFieldErrors, clearErrors]
  )

  // PATCH action 'submit'. Missing fields from the API are shown and jumped to.
  const submit = useCallback(async (): Promise<boolean> => {
    if (!offer) return false
    setBanner(null)
    setSaving(true)
    const result = await patchOffer(partnerId, offer.id, { action: 'submit' })
    setSaving(false)
    if (!result.ok) {
      const missing = result.status === 400 && result.error ? parseMissingFields(result.error) : null
      const mapped = !missing && result.status === 400 && result.error ? mapApiError(result.error) : null
      if (missing && missing.length) {
        showFieldErrors(Object.fromEntries(missing.map((f) => [f, 'Needed to submit.'])))
      } else if (mapped) {
        showFieldErrors({ [mapped.field]: mapped.message })
      } else {
        setBanner({ type: 'error', message: messageForStatus(result.status, result.error, 'submit') })
      }
      return false
    }
    applySaved(result.data)
    setSubmitted(true)
    return true
  }, [offer, partnerId, showFieldErrors, applySaved])

  // Admin review actions (approve / request_changes) and deactivate.
  const review = useCallback(
    async (action: Extract<OfferAction, 'approve' | 'request_changes' | 'deactivate'>, reviewNote?: string) => {
      if (!offer) return false
      setBanner(null)
      setReviewing(true)
      const result = await patchOffer(partnerId, offer.id, {
        action,
        ...(action === 'request_changes' ? { review_note: reviewNote } : {}),
      })
      setReviewing(false)
      if (!result.ok) {
        setBanner({ type: 'error', message: messageForStatus(result.status, result.error, 'review') })
        return false
      }
      applySaved(result.data)
      const done = {
        approve: 'Approved. This offer is now live.',
        request_changes: 'Sent back to the partner with your note.',
        deactivate: 'Deactivated. The offer is back to draft and hidden from the public.',
      }[action]
      setBanner({ type: 'success', message: done })
      return true
    },
    [offer, partnerId, applySaved]
  )

  return {
    // state
    step,
    steps: WIZARD_STEPS,
    loading,
    loadError,
    partner,
    config,
    travels,
    offer,
    form,
    fieldErrors,
    invalidFields,
    legacyNotes,
    banner,
    saving,
    imageSaving,
    reviewing,
    submitted,
    focusToken,
    // actions
    goNext,
    goBack,
    goToStep,
    updateField,
    setRequirement,
    clearErrors,
    setBanner,
    save,
    savePerks,
    switchPricingMode,
    saveImages,
    submit,
    review,
  }
}
