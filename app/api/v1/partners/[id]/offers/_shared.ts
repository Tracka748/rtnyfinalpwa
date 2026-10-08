import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase'
import type { Database, Json } from '@/types/database'

// Shared by offers/route.ts and offers/[offerId]/route.ts. Route files may only
// export HTTP handlers, so validation and auth live here.

export type OfferRow = Database['public']['Tables']['vendor_services']['Row']
export type OfferInsert = Database['public']['Tables']['vendor_services']['Insert']
export type OfferUpdate = Database['public']['Tables']['vendor_services']['Update']
export type OfferStatus = 'draft' | 'pending' | 'active' | 'needs_changes'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface PartnerAccess {
  supabase: ReturnType<typeof createSupabaseAdmin>
  userId: string
  isAdmin: boolean
  isOwner: boolean
  category: string | null
}

// Allowed when profiles.role = 'admin' or partners.owner_id = session user.
// Returns a ready-to-send response on failure.
export async function authorizePartner(partnerId: string): Promise<PartnerAccess | NextResponse> {
  const supabase = createSupabaseAdmin()
  const supabaseServer = await createSupabaseServer()

  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!UUID_RE.test(partnerId)) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  const [profileResult, partnerResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('partners')
      .select('owner_id, category, partner_categories(name)')
      .eq('id', partnerId)
      .maybeSingle(),
  ])

  if (partnerResult.error) logDbError('partners fetch error', partnerResult.error)

  const partner = partnerResult.data
  const isAdmin = profileResult.data?.role === 'admin'
  const isOwner = !!partner && partner.owner_id === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  const joined = partner.partner_categories as { name: string } | { name: string }[] | null
  const categoryName = Array.isArray(joined) ? joined[0]?.name : joined?.name

  return {
    supabase,
    userId: user.id,
    isAdmin,
    isOwner,
    category: categoryName ?? partner.category ?? null,
  }
}

// ─── Errors ───────────────────────────────────────────────────────────────────

interface DbError {
  code?: string
  message?: string
}

// Logs only code + message: Postgres `details` can echo the failing row (i.e. request data).
export function logDbError(context: string, error: DbError) {
  console.error(`${context}:`, { code: error.code, message: error.message })
}

export function dbErrorResponse(context: string, error: DbError, message: string) {
  logDbError(context, error)
  if (error.code === '23514') {
    return NextResponse.json({ error: 'Offer failed validation' }, { status: 400 })
  }
  return NextResponse.json({ error: message }, { status: 500 })
}

// ─── Body parsing ─────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return isPlainObject(body) ? body : null
  } catch {
    return null
  }
}

// ─── Field validation ─────────────────────────────────────────────────────────

// Client-editable columns. Everything else (partner_id, vendor_id, category,
// occasions, status, active, review_note, updated_at, ...) is server-owned.
const EDITABLE_FIELDS = new Set([
  'title', 'price', 'description', 'pricing_model', 'min_guests', 'max_guests',
  'duration_hours', 'advance_notice_hours', 'pitch', 'includes', 'add_ons',
  'availability', 'details', 'offer_image_url', 'gallery_urls',
])

const PRICING_MODELS = new Set(['flat', 'per_person', 'starting_at'])
const AVAILABILITY_KEYS = new Set(['days', 'start_time', 'end_time', 'blackout_dates', 'radius_miles'])
const ADD_ON_KEYS = new Set(['name', 'price'])
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_URL_LENGTH = 2048
const MAX_BLACKOUT_DATES = 366
const MAX_DETAIL_KEY_LENGTH = 50
const MAX_DETAIL_VALUE_LENGTH = 500
const MAX_REVIEW_NOTE_LENGTH = 1000

export const SUBMIT_REQUIRED_FIELDS = ['title', 'price', 'pricing_model', 'max_guests', 'pitch'] as const

// Offer images must live in this partner's offer folder in the public partner-covers bucket.
const OFFER_IMAGE_ORIGIN = 'https://uxpmfnbifhkayljayjtb.supabase.co'
const OFFER_IMAGE_BUCKET_PATH = '/storage/v1/object/public/partner-covers'

type FieldResult<T> = { value: T } | { error: string }

// Route ids used to scope image URLs. offerId is null on create, where images are rejected.
export interface OfferFieldContext {
  partnerId: string
  offerId: string | null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function optionalText(value: unknown, field: string, max: number): FieldResult<string | null> {
  if (value === null) return { value: null }
  if (typeof value !== 'string') return { error: `${field} must be a string` }
  const trimmed = value.trim()
  if (trimmed.length > max) return { error: `${field} must be at most ${max} characters` }
  return { value: trimmed.length === 0 ? null : trimmed }
}

function optionalInt(value: unknown, field: string, min: number, max?: number): FieldResult<number | null> {
  if (value === null) return { value: null }
  if (!Number.isInteger(value)) return { error: `${field} must be an integer` }
  const n = value as number
  if (n < min || (max !== undefined && n > max)) {
    return { error: max === undefined ? `${field} must be at least ${min}` : `${field} must be between ${min} and ${max}` }
  }
  return { value: n }
}

// Accepts only {origin}{bucket}/{partnerId}/offers/{offerId}/<file>, optionally with a query string.
function offerImageUrl(value: unknown, field: string, ctx: OfferFieldContext): FieldResult<string> {
  if (!ctx.offerId) return { error: `${field} can only be set after the offer is created` }
  const pathPrefix = `${OFFER_IMAGE_BUCKET_PATH}/${ctx.partnerId.toLowerCase()}/offers/${ctx.offerId.toLowerCase()}/`
  const invalid = { error: `${field} must be an uploaded image in this offer's storage folder` }

  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return invalid
  if (!value.startsWith(`${OFFER_IMAGE_ORIGIN}${pathPrefix}`)) return invalid

  // Re-check after URL normalization so "../" segments can't escape the folder.
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return invalid
  }
  if (
    url.origin !== OFFER_IMAGE_ORIGIN ||
    url.hash !== '' ||
    /%2e|%2f|%5c|\\/i.test(url.pathname) ||
    !url.pathname.startsWith(pathPrefix) ||
    url.pathname.length === pathPrefix.length
  ) {
    return invalid
  }
  return { value }
}

function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function parseIncludes(value: unknown): FieldResult<string[] | null> {
  if (value === null) return { value: null }
  if (!Array.isArray(value) || value.length > 20) return { error: 'includes must be an array of at most 20 strings' }
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return { error: 'includes must contain only strings' }
    const trimmed = item.trim()
    if (trimmed.length === 0 || trimmed.length > 100) return { error: 'each includes item must be 1-100 characters' }
    items.push(trimmed)
  }
  return { value: items }
}

function parseAddOns(value: unknown): FieldResult<{ name: string; price: number }[]> {
  if (!Array.isArray(value) || value.length > 10) return { error: 'add_ons must be an array of at most 10 items' }
  const items: { name: string; price: number }[] = []
  for (const item of value) {
    if (!isPlainObject(item) || Object.keys(item).some((k) => !ADD_ON_KEYS.has(k))) {
      return { error: 'each add_on must be an object with only name and price' }
    }
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (name.length === 0 || name.length > 60) return { error: 'each add_on name must be 1-60 characters' }
    if (!isFiniteNumber(item.price) || item.price < 0) return { error: 'each add_on price must be a number >= 0' }
    items.push({ name, price: item.price })
  }
  return { value: items }
}

function parseAvailability(value: unknown): FieldResult<Record<string, Json>> {
  if (!isPlainObject(value)) return { error: 'availability must be an object' }
  const out: Record<string, Json> = {}
  for (const key of Object.keys(value)) {
    if (!AVAILABILITY_KEYS.has(key)) return { error: `availability has unknown key: ${key.slice(0, 50)}` }
  }
  if (value.days !== undefined) {
    const days = value.days
    if (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return { error: 'availability.days must be an array of integers 0-6' }
    }
    out.days = [...new Set(days as number[])].sort((a, b) => a - b)
  }
  for (const key of ['start_time', 'end_time'] as const) {
    if (value[key] === undefined) continue
    if (value[key] === null) { out[key] = null; continue }
    if (typeof value[key] !== 'string' || !TIME_RE.test(value[key] as string)) {
      return { error: `availability.${key} must be HH:MM` }
    }
    out[key] = value[key] as string
  }
  if (value.blackout_dates !== undefined) {
    const dates = value.blackout_dates
    if (
      !Array.isArray(dates) ||
      dates.length > MAX_BLACKOUT_DATES ||
      dates.some((d) => typeof d !== 'string' || !isValidIsoDate(d))
    ) {
      return { error: `availability.blackout_dates must be an array of at most ${MAX_BLACKOUT_DATES} YYYY-MM-DD dates` }
    }
    out.blackout_dates = [...new Set(dates as string[])].sort()
  }
  if (value.radius_miles !== undefined) {
    if (value.radius_miles === null) {
      out.radius_miles = null
    } else if (!isFiniteNumber(value.radius_miles) || value.radius_miles < 0 || value.radius_miles > 200) {
      return { error: 'availability.radius_miles must be between 0 and 200' }
    } else {
      out.radius_miles = value.radius_miles
    }
  }
  return { value: out }
}

function parseDetails(value: unknown): FieldResult<Record<string, string | number>> {
  if (!isPlainObject(value)) return { error: 'details must be an object' }
  const keys = Object.keys(value)
  if (keys.length > 20) return { error: 'details may have at most 20 keys' }
  const out: Record<string, string | number> = {}
  for (const key of keys) {
    if (key.length === 0 || key.length > MAX_DETAIL_KEY_LENGTH) {
      return { error: `details keys must be 1-${MAX_DETAIL_KEY_LENGTH} characters` }
    }
    const v = value[key]
    if (typeof v === 'string') {
      if (v.length > MAX_DETAIL_VALUE_LENGTH) return { error: `details values must be at most ${MAX_DETAIL_VALUE_LENGTH} characters` }
      out[key] = v
    } else if (isFiniteNumber(v)) {
      out[key] = v
    } else {
      return { error: 'details values must be strings or numbers' }
    }
  }
  return { value: out }
}

function parseGallery(value: unknown, ctx: OfferFieldContext): FieldResult<string[]> {
  if (!Array.isArray(value) || value.length > 6) return { error: 'gallery_urls must be an array of at most 6 URLs' }
  const urls: string[] = []
  for (const item of value) {
    const result = offerImageUrl(item, 'gallery_urls item', ctx)
    if ('error' in result) return result
    urls.push(result.value)
  }
  return { value: urls }
}

// Whitelist-validates client-editable fields. Unknown keys are rejected.
// Does not enforce required fields; callers decide that per operation.
export function parseOfferFields(
  input: Record<string, unknown>,
  ctx: OfferFieldContext
): { values: OfferUpdate } | { error: string } {
  const values: OfferUpdate = {}

  for (const key of Object.keys(input)) {
    if (!EDITABLE_FIELDS.has(key)) return { error: `Unknown or read-only field: ${key.slice(0, 50)}` }
    // Image paths include the offer id, so images are only accepted once the draft exists.
    if (!ctx.offerId && (key === 'offer_image_url' || key === 'gallery_urls')) {
      return { error: `${key} can only be set after the offer is created` }
    }
  }

  const set = <T>(result: FieldResult<T>, apply: (v: T) => void): string | null => {
    if ('error' in result) return result.error
    apply(result.value)
    return null
  }

  for (const [key, raw] of Object.entries(input)) {
    let error: string | null = null
    switch (key) {
      case 'title': {
        const title = typeof raw === 'string' ? raw.trim() : ''
        if (title.length < 1 || title.length > 80) error = 'title must be 1-80 characters'
        else values.title = title
        break
      }
      case 'price':
        if (!isFiniteNumber(raw) || raw < 0) error = 'price must be a number >= 0'
        else values.price = raw
        break
      case 'description':
        error = set(optionalText(raw, 'description', 1000), (v) => { values.description = v })
        break
      case 'pitch':
        error = set(optionalText(raw, 'pitch', 300), (v) => { values.pitch = v })
        break
      case 'pricing_model':
        if (raw !== null && (typeof raw !== 'string' || !PRICING_MODELS.has(raw))) {
          error = 'pricing_model must be one of flat, per_person, starting_at'
        } else {
          values.pricing_model = raw as string | null
        }
        break
      case 'min_guests':
        error = set(optionalInt(raw, 'min_guests', 1), (v) => { values.min_guests = v })
        break
      case 'max_guests':
        error = set(optionalInt(raw, 'max_guests', 1), (v) => { values.max_guests = v })
        break
      case 'advance_notice_hours':
        error = set(optionalInt(raw, 'advance_notice_hours', 0, 8760), (v) => { values.advance_notice_hours = v })
        break
      case 'duration_hours':
        if (raw === null) values.duration_hours = null
        else if (!isFiniteNumber(raw) || raw <= 0 || raw > 24) error = 'duration_hours must be > 0 and <= 24'
        else values.duration_hours = raw
        break
      case 'includes':
        error = set(parseIncludes(raw), (v) => { values.includes = v })
        break
      case 'add_ons':
        error = set(parseAddOns(raw), (v) => { values.add_ons = v })
        break
      case 'availability':
        error = set(parseAvailability(raw), (v) => { values.availability = v })
        break
      case 'details':
        error = set(parseDetails(raw), (v) => { values.details = v })
        break
      case 'offer_image_url':
        if (raw === null) values.offer_image_url = null
        else error = set(offerImageUrl(raw, 'offer_image_url', ctx), (v) => { values.offer_image_url = v })
        break
      case 'gallery_urls':
        error = set(parseGallery(raw, ctx), (v) => { values.gallery_urls = v })
        break
    }
    if (error) return { error }
  }

  return { values }
}

export function checkGuestRange(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min != null && max != null && min > max) return 'min_guests must be <= max_guests'
  return null
}

export function missingForSubmit(offer: Pick<OfferRow, (typeof SUBMIT_REQUIRED_FIELDS)[number]>): string[] {
  return SUBMIT_REQUIRED_FIELDS.filter((field) => {
    const value = offer[field]
    switch (field) {
      case 'price':
        return !isFiniteNumber(value) || value < 0
      case 'max_guests':
        return !Number.isInteger(value) || (value as number) < 1
      default:
        return typeof value !== 'string' || value.trim().length === 0
    }
  })
}

export function parseReviewNote(value: unknown): FieldResult<string> {
  const note = typeof value === 'string' ? value.trim() : ''
  if (note.length === 0) return { error: 'review_note is required' }
  if (note.length > MAX_REVIEW_NOTE_LENGTH) return { error: `review_note must be at most ${MAX_REVIEW_NOTE_LENGTH} characters` }
  return { value: note }
}
