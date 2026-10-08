'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { OfferRecord, PartnerSummary } from '@/components/custom/offers/types'
import { fieldsForCategory, type CategoryFieldGroup } from '@/components/custom/offers/categoryFields'
import { parseMoney } from '@/components/custom/offers/MoneyInput'
import type { BannerState } from '@/components/custom/offers/FormBanner'

export const WIZARD_STEPS = ['Welcome', 'What you offer', 'Create your offer']
const LAST_STEP = WIZARD_STEPS.length

// ─── Form shape ───────────────────────────────────────────────────────────────
// Inputs hold raw strings so partial values ("12.") survive typing; they are
// parsed and validated in buildPayload().

export interface OfferForm {
  title: string
  description: string
  price: string
  pricingModel: string | null
  includes: string[]
  minGuests: string
  maxGuests: string
  durationHours: string
  advanceNoticeHours: string
  // Adaptive category answers, keyed by AdaptiveField.key.
  details: Record<string, string>
}

// Keys match API field names; adaptive fields use `details.<key>`.
export type FieldErrors = Record<string, string>

const EMPTY_FORM: OfferForm = {
  title: '',
  description: '',
  price: '',
  pricingModel: null,
  includes: [],
  minGuests: '',
  maxGuests: '',
  durationHours: '',
  advanceNoticeHours: '',
  details: {},
}

// Limits mirror app/api/v1/partners/[id]/offers/_shared.ts.
export const LIMITS = {
  title: 80,
  description: 1000,
  includesItems: 20,
  includesItemLength: 100,
  durationMax: 24,
  advanceNoticeMax: 8760,
  detailsKeys: 20,
  detailValueLength: 500,
} as const

const PRICING_MODELS = new Set(['flat', 'per_person', 'starting_at'])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numToString(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function formFromOffer(offer: OfferRecord): OfferForm {
  const details: Record<string, string> = {}
  if (isPlainObject(offer.details)) {
    for (const [k, v] of Object.entries(offer.details)) {
      if (typeof v === 'string' || typeof v === 'number') details[k] = String(v)
    }
  }
  return {
    title: offer.title ?? '',
    description: offer.description ?? '',
    price: numToString(offer.price),
    pricingModel: offer.pricing_model && PRICING_MODELS.has(offer.pricing_model) ? offer.pricing_model : null,
    includes: Array.isArray(offer.includes) ? offer.includes.filter((i): i is string => typeof i === 'string') : [],
    minGuests: numToString(offer.min_guests),
    maxGuests: numToString(offer.max_guests),
    durationHours: numToString(offer.duration_hours),
    advanceNoticeHours: numToString(offer.advance_notice_hours),
    details,
  }
}

// ─── Validation (client mirror of the API whitelist) ─────────────────────────

export interface OfferPayload {
  title: string
  description: string | null
  price: number
  pricing_model: string | null
  includes: string[]
  min_guests: number | null
  max_guests: number | null
  duration_hours: number | null
  advance_notice_hours: number | null
  details: Record<string, string | number>
}

function parseInteger(value: string): number | null {
  if (value.trim() === '') return null
  return /^\d+$/.test(value.trim()) ? Number(value) : NaN
}

function parseDecimal(value: string): number | null {
  if (value.trim() === '' || value === '.') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function buildPayload(
  form: OfferForm,
  group: CategoryFieldGroup | null,
  existingDetails: unknown
): { errors: FieldErrors; payload: OfferPayload | null } {
  const errors: FieldErrors = {}

  const title = form.title.trim()
  if (!title) errors.title = 'Give your offer a name.'
  else if (title.length > LIMITS.title) errors.title = `Keep it under ${LIMITS.title} characters.`

  const description = form.description.trim()
  if (description.length > LIMITS.description) {
    errors.description = `Keep it under ${LIMITS.description} characters.`
  }

  const price = parseMoney(form.price)
  if (price === null) errors.price = 'Add a price. Use 0 if it’s free.'
  else if (price < 0) errors.price = 'Price can’t be negative.'

  if (form.pricingModel !== null && !PRICING_MODELS.has(form.pricingModel)) {
    errors.pricing_model = 'Pick how this is priced.'
  }

  const includes = form.includes.map((i) => i.trim()).filter(Boolean)
  if (includes.length > LIMITS.includesItems) errors.includes = `Up to ${LIMITS.includesItems} items.`
  else if (includes.some((i) => i.length > LIMITS.includesItemLength)) {
    errors.includes = `Each item must be under ${LIMITS.includesItemLength} characters.`
  }

  const minGuests = parseInteger(form.minGuests)
  const maxGuests = parseInteger(form.maxGuests)
  if (minGuests !== null && (Number.isNaN(minGuests) || minGuests < 1)) errors.min_guests = 'At least 1 guest.'
  if (maxGuests !== null && (Number.isNaN(maxGuests) || maxGuests < 1)) errors.max_guests = 'At least 1 guest.'
  if (!errors.min_guests && !errors.max_guests && minGuests !== null && maxGuests !== null && minGuests > maxGuests) {
    errors.max_guests = 'Max guests must be at least the minimum.'
  }

  const duration = parseDecimal(form.durationHours)
  if (duration !== null && (Number.isNaN(duration) || duration <= 0 || duration > LIMITS.durationMax)) {
    errors.duration_hours = `Between 0 and ${LIMITS.durationMax} hours.`
  }

  const advance = parseInteger(form.advanceNoticeHours)
  if (advance !== null && (Number.isNaN(advance) || advance > LIMITS.advanceNoticeMax)) {
    errors.advance_notice_hours = `Up to ${LIMITS.advanceNoticeMax} hours (one year).`
  }

  // Keep detail keys this step doesn't own (e.g. written by later steps).
  const details: Record<string, string | number> = {}
  const ownedKeys = new Set(group?.fields.map((f) => f.key) ?? [])
  if (isPlainObject(existingDetails)) {
    for (const [k, v] of Object.entries(existingDetails)) {
      if (!ownedKeys.has(k) && (typeof v === 'string' || typeof v === 'number')) details[k] = v
    }
  }

  for (const field of group?.fields ?? []) {
    const raw = (form.details[field.key] ?? '').trim()
    if (!raw) continue
    const errKey = `details.${field.key}`
    switch (field.kind) {
      case 'money': {
        const n = parseMoney(raw)
        if (n === null || n < 0) errors[errKey] = 'Enter an amount of 0 or more.'
        else details[field.key] = n
        break
      }
      case 'integer': {
        const n = parseInteger(raw)
        if (n === null || Number.isNaN(n) || n < field.min || n > field.max) {
          errors[errKey] = `Enter a whole number from ${field.min} to ${field.max}.`
        } else {
          details[field.key] = n
        }
        break
      }
      case 'text':
        if (raw.length > Math.min(field.maxLength, LIMITS.detailValueLength)) {
          errors[errKey] = `Keep it under ${field.maxLength} characters.`
        } else {
          details[field.key] = raw
        }
        break
      case 'chips':
        if (!field.options.some((o) => o.value === raw)) errors[errKey] = 'Pick one of the options.'
        else details[field.key] = raw
        break
    }
  }
  if (Object.keys(details).length > LIMITS.detailsKeys) {
    errors.details = 'Too many extra details on this offer.'
  }

  if (Object.keys(errors).length > 0 || price === null) return { errors, payload: null }

  return {
    errors,
    payload: {
      title,
      description: description || null,
      price,
      pricing_model: form.pricingModel,
      includes,
      min_guests: minGuests,
      max_guests: maxGuests,
      duration_hours: duration,
      advance_notice_hours: advance,
      details,
    },
  }
}

// ─── API error mapping ────────────────────────────────────────────────────────

const API_FIELDS = new Set([
  'title', 'price', 'description', 'pricing_model', 'includes', 'min_guests',
  'max_guests', 'duration_hours', 'advance_notice_hours', 'details',
])

// API 400 messages start with the field name, e.g. "title must be 1-80 characters"
// or "each includes item must be 1-100 characters".
function mapApiError(message: string): { field: string; message: string } | null {
  const match = message.match(/^(?:each\s+)?([a-z_]+)(?:\s+item)?\s+(.*)$/)
  if (!match || !API_FIELDS.has(match[1])) return null
  const rest = match[2]
  return { field: match[1], message: rest.charAt(0).toUpperCase() + rest.slice(1) + '.' }
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
  const [banner, setBanner] = useState<BannerState | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // Id of the offer already in state, so updating ?offer= after a create
  // doesn't trigger a reload.
  const currentOfferIdRef = useRef<string | null>(null)

  const categoryGroup = useMemo(() => fieldsForCategory(partner?.categoryName), [partner?.categoryName])

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
        setPartner({
          id: partnerRow.id,
          displayName: partnerRow.display_name,
          categoryName: joinedName ?? partnerRow.category ?? null,
        })

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
          setForm(formFromOffer(found))
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

  const updateField = useCallback(<K extends keyof OfferForm>(key: K, value: OfferForm[K], errorKey?: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errorKey) {
      setFieldErrors((e) => {
        if (!e[errorKey]) return e
        const next = { ...e }
        delete next[errorKey]
        return next
      })
    }
  }, [])

  const setDetail = useCallback((key: string, value: string) => {
    setForm((f) => ({ ...f, details: { ...f.details, [key]: value } }))
    setFieldErrors((e) => {
      const errKey = `details.${key}`
      if (!e[errKey]) return e
      const next = { ...e }
      delete next[errKey]
      return next
    })
  }, [])

  const goNext = useCallback(() => {
    setBanner(null)
    setStep((s) => Math.min(s + 1, LAST_STEP))
  }, [])

  const goBack = useCallback(() => {
    setBanner(null)
    setStep((s) => Math.max(s - 1, 1))
  }, [])

  // Creates the draft (POST) or saves edits (PATCH action 'save').
  // Returns the saved row, or null when validation or the request failed.
  const save = useCallback(async (): Promise<OfferRecord | null> => {
    const { errors, payload } = buildPayload(form, categoryGroup, offer?.details)
    setFieldErrors(errors)
    if (!payload) {
      setBanner({ type: 'error', message: errors.details ?? 'A few fields need another look.' })
      return null
    }

    setSaving(true)
    setBanner(null)
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
          setBanner({ type: 'error', message: 'A few fields need another look.' })
        } else {
          setBanner({ type: 'error', message: messageForStatus(res.status, json.error, 'save') })
        }
        return null
      }

      const saved = json.data as OfferRecord
      currentOfferIdRef.current = saved.id
      setOffer(saved)
      setForm(formFromOffer(saved))
      return saved
    } catch {
      setBanner({ type: 'error', message: 'We couldn’t reach the server. Check your connection and try again.' })
      return null
    } finally {
      setSaving(false)
    }
  }, [form, categoryGroup, offer, partnerId])

  return {
    // state
    step,
    steps: WIZARD_STEPS,
    loading,
    loadError,
    partner,
    categoryGroup,
    offer,
    form,
    fieldErrors,
    banner,
    saving,
    showSummary,
    // actions
    goNext,
    goBack,
    updateField,
    setDetail,
    setBanner,
    setShowSummary,
    save,
  }
}
