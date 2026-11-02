// Pure validators for the admin catalog routes. No I/O, no Next imports.

export const ITEM_TYPES = ['decoration', 'venue', 'entertainment', 'activity', 'food', 'favor', 'other'] as const
export type ItemType = (typeof ITEM_TYPES)[number]
export const CREATE_STATUSES = ['draft', 'active'] as const
export const ITEM_STATUSES = ['draft', 'active', 'archived'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]
export const PRICE_TREATMENTS = ['listed', 'free', 'quote'] as const
export type PriceTreatment = (typeof PRICE_TREATMENTS)[number]
export const LINK_STATUSES = ['approved', 'rejected'] as const
export type LinkStatus = (typeof LINK_STATUSES)[number]

export const LIMITS = {
  key: 64, name: 120, description: 2000, occasions: 20, occasion: 40,
  imageUrl: 2048, themeIds: 50, search: 80, maxOffset: 10000,
} as const

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const pass = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_RE = /^[a-z][a-z0-9_]*$/

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, c => `\\${c}`)

type Obj = Record<string, unknown>

function asObject(v: unknown): Validated<Obj> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? pass(v as Obj)
    : fail('Request body must be a JSON object')
}

function unknownKeys(body: Obj, allowed: readonly string[]): string | null {
  const extra = Object.keys(body).filter(k => !allowed.includes(k))
  return extra.length
    ? `Unknown field(s): ${extra.slice(0, 5).map(k => k.slice(0, 40)).join(', ')}`
    : null
}

function parseText(field: string, v: unknown, max: number): Validated<string> {
  if (typeof v !== 'string') return fail(`${field} must be a string`)
  const s = v.trim()
  if (!s) return fail(`${field} is required`)
  if (s.length > max) return fail(`${field} must be at most ${max} characters`)
  return pass(s)
}

function parseOptionalText(field: string, v: unknown, max: number): Validated<string | null> {
  if (v === null) return pass(null)
  if (typeof v !== 'string') return fail(`${field} must be a string or null`)
  const s = v.trim()
  if (s.length > max) return fail(`${field} must be at most ${max} characters`)
  return pass(s || null)
}

function parseEnum<T extends string>(field: string, v: unknown, allowed: readonly T[]): Validated<T> {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? pass(v as T)
    : fail(`${field} must be one of: ${allowed.join(', ')}`)
}

function parseSlug(v: unknown): Validated<string> {
  if (typeof v !== 'string') return fail('key must be a string')
  if (v.length > LIMITS.key) return fail(`key must be at most ${LIMITS.key} characters`)
  if (!SLUG_RE.test(v)) return fail('key must start with a lowercase letter and contain only a-z, 0-9 and _')
  return pass(v)
}

function parseOccasions(v: unknown): Validated<string[]> {
  if (!Array.isArray(v)) return fail('occasions must be an array of strings')
  if (v.length > LIMITS.occasions) return fail(`occasions can have at most ${LIMITS.occasions} items`)
  const out: string[] = []
  for (const o of v) {
    if (typeof o !== 'string') return fail('occasions must be an array of strings')
    const s = o.trim()
    if (!s) return fail('occasions cannot contain empty values')
    if (s.length > LIMITS.occasion) return fail(`each occasion must be at most ${LIMITS.occasion} characters`)
    if (!out.includes(s)) out.push(s)
  }
  return pass(out)
}

function parseImageUrl(v: unknown): Validated<string | null> {
  if (v === null) return pass(null)
  if (typeof v !== 'string') return fail('image_url must be a string or null')
  const s = v.trim()
  if (!s) return pass(null)
  if (s.length > LIMITS.imageUrl) return fail(`image_url must be at most ${LIMITS.imageUrl} characters`)
  let u: URL
  try { u = new URL(s) } catch { return fail('image_url must be a valid https URL') }
  if (u.protocol !== 'https:' || u.username || u.password) return fail('image_url must be a valid https URL')
  return pass(s)
}

// ---- catalog items ----

export interface CreateItemInput {
  key: string
  name: string
  description: string | null
  item_type: ItemType
  occasions: string[]
  image_url: string | null
  status: 'draft' | 'active'
}

const CREATE_KEYS = ['key', 'name', 'description', 'item_type', 'occasions', 'image_url', 'status'] as const

export function validateCreateItem(raw: unknown): Validated<CreateItemInput> {
  const o = asObject(raw)
  if (!o.ok) return o
  const body = o.value
  const extra = unknownKeys(body, CREATE_KEYS)
  if (extra) return fail(extra)

  const key = parseSlug(body.key)
  if (!key.ok) return key
  const name = parseText('name', body.name, LIMITS.name)
  if (!name.ok) return name
  const description = body.description === undefined ? pass(null) : parseOptionalText('description', body.description, LIMITS.description)
  if (!description.ok) return description
  const item_type = parseEnum('item_type', body.item_type, ITEM_TYPES)
  if (!item_type.ok) return item_type
  const occasions = body.occasions === undefined ? pass([] as string[]) : parseOccasions(body.occasions)
  if (!occasions.ok) return occasions
  const image_url = body.image_url === undefined ? pass(null) : parseImageUrl(body.image_url)
  if (!image_url.ok) return image_url
  const status = body.status === undefined ? pass('draft' as const) : parseEnum('status', body.status, CREATE_STATUSES)
  if (!status.ok) return status

  return pass({
    key: key.value, name: name.value, description: description.value, item_type: item_type.value,
    occasions: occasions.value, image_url: image_url.value, status: status.value,
  })
}

export interface UpdateItemInput {
  name?: string
  description?: string | null
  item_type?: ItemType
  occasions?: string[]
  image_url?: string | null
  status?: ItemStatus
}

const UPDATE_KEYS = ['name', 'description', 'item_type', 'occasions', 'image_url', 'status'] as const

export function validateUpdateItem(raw: unknown): Validated<UpdateItemInput> {
  const o = asObject(raw)
  if (!o.ok) return o
  const body = o.value
  if ('key' in body) return fail('key cannot be changed')
  const extra = unknownKeys(body, UPDATE_KEYS)
  if (extra) return fail(extra)

  const patch: UpdateItemInput = {}
  if (body.name !== undefined) {
    const r = parseText('name', body.name, LIMITS.name); if (!r.ok) return r; patch.name = r.value
  }
  if (body.description !== undefined) {
    const r = parseOptionalText('description', body.description, LIMITS.description); if (!r.ok) return r; patch.description = r.value
  }
  if (body.item_type !== undefined) {
    const r = parseEnum('item_type', body.item_type, ITEM_TYPES); if (!r.ok) return r; patch.item_type = r.value
  }
  if (body.occasions !== undefined) {
    const r = parseOccasions(body.occasions); if (!r.ok) return r; patch.occasions = r.value
  }
  if (body.image_url !== undefined) {
    const r = parseImageUrl(body.image_url); if (!r.ok) return r; patch.image_url = r.value
  }
  if (body.status !== undefined) {
    const r = parseEnum('status', body.status, ITEM_STATUSES); if (!r.ok) return r; patch.status = r.value
  }
  if (Object.keys(patch).length === 0) return fail('No fields to update')
  return pass(patch)
}

export function validateThemeIds(raw: unknown): Validated<{ theme_ids: string[] }> {
  const o = asObject(raw)
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['theme_ids'])
  if (extra) return fail(extra)
  const ids = o.value.theme_ids
  if (!Array.isArray(ids)) return fail('theme_ids must be an array of uuids')
  if (ids.length > LIMITS.themeIds) return fail(`theme_ids can have at most ${LIMITS.themeIds} items`)
  const out: string[] = []
  for (const id of ids) {
    if (!isUuid(id)) return fail('theme_ids must contain valid uuids')
    const lower = id.toLowerCase()
    if (!out.includes(lower)) out.push(lower)
  }
  return pass({ theme_ids: out })
}

// ---- catalog item <-> service links ----

export function validateCreateLink(raw: unknown): Validated<{ service_id: string; price_treatment: PriceTreatment }> {
  const o = asObject(raw)
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['service_id', 'price_treatment'])
  if (extra) return fail(extra)
  if (!isUuid(o.value.service_id)) return fail('service_id must be a valid uuid')
  // Deliberately required with no default: the admin always chooses.
  const pt = parseEnum('price_treatment', o.value.price_treatment, PRICE_TREATMENTS)
  if (!pt.ok) return pt
  return pass({ service_id: o.value.service_id.toLowerCase(), price_treatment: pt.value })
}

export function validateUpdateLink(raw: unknown): Validated<{ price_treatment?: PriceTreatment; status?: LinkStatus }> {
  const o = asObject(raw)
  if (!o.ok) return o
  const body = o.value
  if ('catalog_item_id' in body || 'service_id' in body) return fail('A link cannot be repointed to another item or service')
  const extra = unknownKeys(body, ['price_treatment', 'status'])
  if (extra) return fail(extra)
  const patch: { price_treatment?: PriceTreatment; status?: LinkStatus } = {}
  if (body.price_treatment !== undefined) {
    const r = parseEnum('price_treatment', body.price_treatment, PRICE_TREATMENTS); if (!r.ok) return r; patch.price_treatment = r.value
  }
  if (body.status !== undefined) {
    const r = parseEnum('status', body.status, LINK_STATUSES); if (!r.ok) return r; patch.status = r.value
  }
  if (Object.keys(patch).length === 0) return fail('No fields to update')
  return pass(patch)
}

// ---- query strings ----

export function validateItemListQuery(
  sp: URLSearchParams
): Validated<{ status?: ItemStatus; item_type?: ItemType; offset: number }> {
  const out: { status?: ItemStatus; item_type?: ItemType; offset: number } = { offset: 0 }
  const status = sp.get('status')
  if (status) { const r = parseEnum('status', status, ITEM_STATUSES); if (!r.ok) return r; out.status = r.value }
  const type = sp.get('item_type')
  if (type) { const r = parseEnum('item_type', type, ITEM_TYPES); if (!r.ok) return r; out.item_type = r.value }
  const rawOffset = sp.get('offset')
  if (rawOffset !== null && rawOffset !== '') {
    const msg = `offset must be an integer from 0 to ${LIMITS.maxOffset}`
    if (!/^\d+$/.test(rawOffset)) return fail(msg)
    const n = Number(rawOffset)
    if (n > LIMITS.maxOffset) return fail(msg)
    out.offset = n
  }
  return pass(out)
}

export function validateEligibleQuery(sp: URLSearchParams): Validated<{ q: string | null; limit: number }> {
  const q = (sp.get('q') ?? '').trim()
  if (q.length > LIMITS.search) return fail(`q must be at most ${LIMITS.search} characters`)
  const rawLimit = sp.get('limit')
  let limit = 50
  if (rawLimit !== null && rawLimit !== '') {
    if (!/^\d+$/.test(rawLimit)) return fail('limit must be an integer from 1 to 100')
    limit = Number(rawLimit)
    if (limit < 1 || limit > 100) return fail('limit must be an integer from 1 to 100')
  }
  return pass({ q: q || null, limit })
}
