'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { OfferRecord, PartnerSummary } from '@/components/custom/offers/types'
import { PRICED_MODELS } from '@/components/custom/offers/types'
import {
  DURATION_OPTIONS,
  LEGACY_NOTE_KEYS,
  NOTICE_OPTIONS,
  configForCategory,
  durationLabelForHours,
  noticeLabelForHours,
  type CategoryConfig,
} from '@/components/custom/offers/categoryFields'
import { parseMoney } from '@/components/custom/offers/MoneyInput'
import type { BannerState } from '@/components/custom/offers/FormBanner'

export const WIZARD_STEPS = ['Welcome', 'What you offer', 'Create your offer']
const LAST_STEP = WIZARD_STEPS.length

// ─── Form shape ───────────────────────────────────────────────────────────────

export type RequirementValue = string | string[]

export interface OfferForm {
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
}

// Keys match API field names; requirement fields use `details.<key>`.
export type FieldErrors = Record<string, string>

const EMPTY_FORM: OfferForm = {
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
}

// Mirrors app/api/v1/partners/[id]/offers/_shared.ts (description is capped lower in the UI).
export const LIMITS = {
  title: 80,
  description: 300,
  includesItems: 20,
  includesItemLength: 100,
  detailsKeys: 20,
  detailListItems: 12,
} as const

const PRICING_MODELS = new Set(['free', 'flat', 'per_person', 'starting_at', 'contact'])
const STEP_DETAIL_KEYS = ['duration_label', 'notice_label']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
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

  const savedDuration = typeof details.duration_label === 'string' ? details.duration_label : null
  const savedNotice = typeof details.notice_label === 'string' ? details.notice_label : null

  return {
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
  }
}

// ─── Field labels, order and DOM ids (banner + focus) ────────────────────────

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
}

export function fieldDomId(key: string): string {
  if (key.startsWith('details.')) return `offer-detail-${key.slice('details.'.length)}`
  return BASE_DOM_IDS[key] ?? key
}

function fieldOrder(config: CategoryConfig): [string, string][] {
  return [
    ...BASE_FIELD_ORDER,
    ...(config.requirements?.fields ?? []).map((f): [string, string] => [`details.${f.key}`, f.label]),
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
}

function buildPayload(
  form: OfferForm,
  config: CategoryConfig,
  existingDetails: unknown
): { errors: FieldErrors; payload: OfferPayload | null } {
  const errors: FieldErrors = {}

  const title = form.title.trim()
  if (!title) errors.title = 'Give your offer a name.'
  else if (title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`

  const description = form.description.trim()
  if (description.length > LIMITS.description) errors.description = `Keep it under ${LIMITS.description} characters.`

  const model = form.pricingModel
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
  if (isPlainObject(existingDetails)) {
    for (const [k, v] of Object.entries(existingDetails)) {
      if (ownedKeys.has(k)) continue
      if (typeof v === 'string' || typeof v === 'number') details[k] = v
      else if (Array.isArray(v)) details[k] = stringList(v)
    }
  }
  if (form.durationLabel) details.duration_label = form.durationLabel
  if (form.noticeLabel) details.notice_label = form.noticeLabel

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
    },
  }
}

// ─── API error mapping ────────────────────────────────────────────────────────

const API_FIELDS = new Set([
  'title', 'price', 'description', 'pricing_model', 'includes', 'min_guests',
  'max_guests', 'duration_hours', 'advance_notice_hours', 'details',
])

const FRIENDLY_API_MESSAGES: [RegExp, string][] = [
  [/^price is required/, 'Add a price, or choose Free or Contact us.'],
  [/^pricing_model must be one of/, 'Pick how this is priced.'],
  [/^min_guests must be <= max_guests/, 'Minimum can’t be more than the maximum.'],
]

// API 400 messages start with the field name, e.g. "title must be 1-80 characters",
// "each includes item must be 1-100 characters" or "details.food_drink may have at most 12 items".
export function mapApiError(message: string): { field: string; message: string } | null {
  const match = message.match(/^(?:each\s+)?([a-z_]+(?:\.[a-z0-9_]+)?)(?:\s+item)?\s+(.*)$/)
  if (!match) return null
  const field = match[1]
  const base = field.split('.')[0]
  if (!API_FIELDS.has(base) || (field.includes('.') && base !== 'details')) return null
  const friendly = FRIENDLY_API_MESSAGES.find(([re]) => re.test(message))?.[1]
  const rest = match[2]
  return { field, message: friendly ?? `${rest.charAt(0).toUpperCase()}${rest.slice(1)}.` }
}

function messageForStatus(status: number, apiError: string | undefined, action: 'load' | 'save'): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Sign in again to keep working on this offer.'
    case 403:
      return 'You don’t have access to this partner’s offers.'
    case 404:
      return 'We couldn’t find this offer. It may have been deleted.'
    case 409:
      return 'This offer was changed somewhere else. Reload the page to get the latest version.'
    case 400:
      return apiError ?? 'Some details need another look.'
    default:
      return action === 'load'
        ? 'We couldn’t load this offer. Please try again.'
        : 'Something went wrong saving your offer. Please try again.'
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOfferWizardArgs {
  partnerId: string
  offerId: string | null
}

export function useOfferWizard({ partnerId, offerId }: UseOfferWizardArgs) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [partner, setPartner] = useState<PartnerSummary | null>(null)
  const [offer, setOffer] = useState<OfferRecord | null>(null)
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  // Non-field problems (auth, conflicts, network). Field problems are derived from fieldErrors.
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  // Bumped when validation fails so the view can focus the first invalid field.
  const [focusToken, setFocusToken] = useState(0)

  // Id of the offer already in state, so updating ?offer= after a create
  // doesn't trigger a reload.
  const currentOfferIdRef = useRef<string | null>(null)

  const config = useMemo(() => configForCategory(partner?.categoryName), [partner?.categoryName])
  const order = useMemo(() => fieldOrder(config), [config])

  // Ordered list of fields that currently have an error, for the banner and focus.
  const invalidFields = useMemo(
    () => order.filter(([key]) => fieldErrors[key]).map(([key, label]) => ({ key, label })),
    [order, fieldErrors]
  )

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
          setForm(formFromOffer(found, configForCategory(categoryName)))
          setStep(LAST_STEP)
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
      setForm((f) => ({ ...f, [key]: value }))
      if (errorKeys.length) clearErrors(...errorKeys)
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

  const goNext = useCallback(() => {
    setBanner(null)
    setStep((s) => Math.min(s + 1, LAST_STEP))
  }, [])

  const goBack = useCallback(() => {
    setBanner(null)
    setFieldErrors({})
    setStep((s) => Math.max(s - 1, 1))
  }, [])

  // Creates the draft (POST) or saves edits (PATCH action 'save').
  // Returns the saved row, or null when validation or the request failed.
  const save = useCallback(async (): Promise<OfferRecord | null> => {
    setBanner(null)
    const { errors, payload } = buildPayload(form, config, offer?.details)
    setFieldErrors(errors)
    if (!payload) {
      setFocusToken((t) => t + 1)
      return null
    }

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
        if (mapped) {
          setFieldErrors({ [mapped.field]: mapped.message })
          setFocusToken((t) => t + 1)
        } else {
          setBanner({ type: 'error', message: messageForStatus(res.status, json.error, 'save') })
        }
        return null
      }

      const saved = json.data as OfferRecord
      currentOfferIdRef.current = saved.id
      setOffer(saved)
      setForm(formFromOffer(saved, config))
      setFieldErrors({})
      setBanner(null)
      return saved
    } catch {
      setBanner({ type: 'error', message: 'We couldn’t reach the server. Check your connection and try again.' })
      return null
    } finally {
      setSaving(false)
    }
  }, [form, config, offer, partnerId])

  return {
    // state
    step,
    steps: WIZARD_STEPS,
    loading,
    loadError,
    partner,
    config,
    offer,
    form,
    fieldErrors,
    invalidFields,
    legacyNotes,
    banner,
    saving,
    showSummary,
    focusToken,
    // actions
    goNext,
    goBack,
    updateField,
    setRequirement,
    setBanner,
    setShowSummary,
    save,
  }
}
