// Pure validators for the admin package routes. No I/O, no Next imports.
// Limits mirror theme_package_save_draft (migration 20261102100007) exactly, so a bad payload
// is rejected here with a clear message instead of failing inside the RPC.

import { isUuid, type Validated } from '@/lib/catalog-validation'

export const PACKAGE_STATUSES = ['active', 'archived'] as const
export type PackageStatus = (typeof PACKAGE_STATUSES)[number]
export const REQUIREMENTS = ['required', 'optional_on', 'optional_off'] as const
export type Requirement = (typeof REQUIREMENTS)[number]

export const PKG_LIMITS = {
  key: 64, occasion: 60, title: 120, subtitle: 160, description: 4000, url: 2048, priceNote: 200,
  guestsMin: 1, guestsMax: 10000, components: 30, options: 10, slotLabel: 80, quantityMax: 99,
  notes: 500, note: 2000, revisionMax: 2147483647, maxOffset: 10000,
} as const
const L = PKG_LIMITS

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const pass = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })
const prefixed = <T>(prefix: string, r: Validated<T>): Validated<T> => (r.ok ? r : fail(`${prefix}: ${r.error}`))

type Obj = Record<string, unknown>
const SLUG_RE = /^[a-z][a-z0-9_]*$/

function asObject(v: unknown, what: string): Validated<Obj> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? pass(v as Obj) : fail(`${what} must be a JSON object`)
}

function unknownKeys(body: Obj, allowed: readonly string[]): string | null {
  const extra = Object.keys(body).filter(k => !allowed.includes(k))
  return extra.length ? `Unknown field(s): ${extra.slice(0, 5).map(k => k.slice(0, 40)).join(', ')}` : null
}

function parseText(field: string, v: unknown, max: number): Validated<string> {
  if (typeof v !== 'string') return fail(`${field} must be a string`)
  const s = v.trim()
  if (!s) return fail(`${field} is required`)
  if (s.length > max) return fail(`${field} must be at most ${max} characters`)
  return pass(s)
}

function parseNullableText(field: string, v: unknown, max: number): Validated<string | null> {
  if (v === null) return pass(null)
  if (typeof v !== 'string') return fail(`${field} must be a string or null`)
  const s = v.trim()
  if (s.length > max) return fail(`${field} must be at most ${max} characters`)
  return pass(s || null)
}

function parseSlug(v: unknown): Validated<string> {
  if (typeof v !== 'string') return fail('key must be a string')
  if (v.length > L.key) return fail(`key must be at most ${L.key} characters`)
  if (!SLUG_RE.test(v)) return fail('key must start with a lowercase letter and contain only a-z, 0-9 and _')
  return pass(v)
}

function parseHttps(field: string, v: unknown): Validated<string | null> {
  if (v === null) return pass(null)
  if (typeof v !== 'string') return fail(`${field} must be a string or null`)
  const s = v.trim()
  if (!s) return pass(null)
  if (s.length > L.url) return fail(`${field} must be at most ${L.url} characters`)
  let u: URL
  try { u = new URL(s) } catch { return fail(`${field} must be a valid https URL`) }
  if (u.protocol !== 'https:' || u.username || u.password) return fail(`${field} must be a valid https URL`)
  return pass(s)
}

function parseIntIn(field: string, v: unknown, min: number, max: number): Validated<number> {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
    ? pass(v)
    : fail(`${field} must be an integer from ${min} to ${max}`)
}

function parseNullableInt(field: string, v: unknown, min: number, max: number): Validated<number | null> {
  return v === null ? pass(null) : parseIntIn(field, v, min, max)
}

function parseRevision(v: unknown): Validated<number> {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= L.revisionMax
    ? pass(v)
    : fail('expected_revision must be an integer of at least 1')
}

// ---- packages ----

export function validateCreatePackage(raw: unknown): Validated<{
  key: string; occasion: string; theme_id: string | null; title: string
}> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['key', 'occasion', 'theme_id', 'title'])
  if (extra) return fail(extra)
  const key = parseSlug(o.value.key)
  if (!key.ok) return key
  const occasion = parseText('occasion', o.value.occasion, L.occasion)
  if (!occasion.ok) return occasion
  const title = parseText('title', o.value.title, L.title)
  if (!title.ok) return title
  let theme_id: string | null = null
  if (o.value.theme_id !== undefined && o.value.theme_id !== null) {
    if (!isUuid(o.value.theme_id)) return fail('theme_id must be a valid uuid')
    theme_id = o.value.theme_id.toLowerCase()
  }
  return pass({ key: key.value, occasion: occasion.value, theme_id, title: title.value })
}

export function validatePackagePatch(raw: unknown): Validated<{ status: PackageStatus }> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['status'])
  if (extra) return fail(extra)
  const s = o.value.status
  return typeof s === 'string' && (PACKAGE_STATUSES as readonly string[]).includes(s)
    ? pass({ status: s as PackageStatus })
    : fail(`status must be one of: ${PACKAGE_STATUSES.join(', ')}`)
}

export function validatePackageListQuery(sp: URLSearchParams): Validated<{ status?: PackageStatus; offset: number }> {
  const out: { status?: PackageStatus; offset: number } = { offset: 0 }
  const status = sp.get('status')
  if (status) {
    if (!(PACKAGE_STATUSES as readonly string[]).includes(status)) return fail(`status must be one of: ${PACKAGE_STATUSES.join(', ')}`)
    out.status = status as PackageStatus
  }
  const rawOffset = sp.get('offset')
  if (rawOffset !== null && rawOffset !== '') {
    const msg = `offset must be an integer from 0 to ${L.maxOffset}`
    if (!/^\d+$/.test(rawOffset)) return fail(msg)
    const n = Number(rawOffset)
    if (n > L.maxOffset) return fail(msg)
    out.offset = n
  }
  return pass(out)
}

// ---- status transitions ----

/** submit / withdraw: { expected_revision } only. */
export function validateRevisionBody(raw: unknown): Validated<{ expected_revision: number }> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['expected_revision'])
  if (extra) return fail(extra)
  const rev = parseRevision(o.value.expected_revision)
  if (!rev.ok) return rev
  return pass({ expected_revision: rev.value })
}

export function validateApprove(raw: unknown): Validated<{ expected_revision: number; note: string | null }> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['expected_revision', 'note'])
  if (extra) return fail(extra)
  const rev = parseRevision(o.value.expected_revision)
  if (!rev.ok) return rev
  const note = o.value.note === undefined ? pass(null) : parseNullableText('note', o.value.note, L.note)
  if (!note.ok) return note
  return pass({ expected_revision: rev.value, note: note.value })
}

export function validateRequestChanges(raw: unknown): Validated<{ expected_revision: number; note: string }> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['expected_revision', 'note'])
  if (extra) return fail(extra)
  const rev = parseRevision(o.value.expected_revision)
  if (!rev.ok) return rev
  const note = parseText('note', o.value.note, L.note)
  if (!note.ok) return note
  return pass({ expected_revision: rev.value, note: note.value })
}

// ---- pricing terms ----
// Early, friendly mirror of tp_normalize_pricing_terms (migration 20261104100008). The DB stays the authority.

export interface StructuredTermsInput {
  mode: 'structured'; base_price: number; included_guests: number; extra_guest_price: number
  service_charge_pct: number; service_charge_label: string | null; deposit_amount: number
  balance_due_days: number; notes: string[]
}
export interface FreeTextTermsInput { mode: 'free_text'; free_text: string; notes: string[] }
export type PricingTermsInput = StructuredTermsInput | FreeTextTermsInput

const PRICING_KEYS = [
  'mode', 'base_price', 'included_guests', 'extra_guest_price', 'service_charge_pct',
  'service_charge_label', 'deposit_amount', 'balance_due_days', 'free_text', 'notes',
] as const
const STRUCTURED_ONLY = [
  'base_price', 'included_guests', 'extra_guest_price', 'service_charge_pct',
  'service_charge_label', 'deposit_amount', 'balance_due_days',
] as const
const PRICING_NOTES_MAX = 12
const PRICING_NOTE_LEN = 200
const FREE_TEXT_MAX = 2000
const SERVICE_LABEL_MAX = 80

function parseMoney(field: string, v: unknown, max: number): Validated<number> {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fail(`${field} must be a number`)
  if (v < 0 || v > max) return fail(`${field} must be between 0 and ${max.toLocaleString('en-US')}`)
  const cents = Math.round(v * 100)
  if (Math.abs(v * 100 - cents) > 1e-7) return fail(`${field} can have at most two decimal places`)
  return pass(cents / 100)
}

function optionalOr<T>(v: unknown, dflt: T, f: (x: unknown) => Validated<T>): Validated<T> {
  return v === undefined || v === null ? pass(dflt) : f(v)
}

function parsePricingNotes(v: unknown): Validated<string[]> {
  if (v === undefined || v === null) return pass([])
  if (!Array.isArray(v)) return fail('notes must be a list')
  if (v.length > PRICING_NOTES_MAX) return fail(`a package can have at most ${PRICING_NOTES_MAX} pricing notes`)
  const out: string[] = []
  for (const n of v) {
    if (typeof n !== 'string' || n.trim() === '' || n.trim().length > PRICING_NOTE_LEN) {
      return fail(`each pricing note must be 1 to ${PRICING_NOTE_LEN} characters`)
    }
    out.push(n.trim())
  }
  return pass(out)
}

/** object -> normalized terms, null -> clears. (Absence is handled by the caller.) */
function validatePricingTerms(v: unknown): Validated<PricingTermsInput | null> {
  if (v === null) return pass(null)
  const o = asObject(v, 'pricing_terms')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, PRICING_KEYS)
  if (extra) return fail(extra)
  const b = o.value
  const notes = parsePricingNotes(b.notes)
  if (!notes.ok) return notes

  if (b.mode === 'free_text') {
    const stray = STRUCTURED_ONLY.find(k => b[k] !== undefined)
    if (stray) return fail(`${stray} is not allowed in free-text pricing`)
    const t = parseText('free_text', b.free_text, FREE_TEXT_MAX)
    if (!t.ok) return t
    return pass({ mode: 'free_text', free_text: t.value, notes: notes.value })
  }
  if (b.mode !== 'structured') return fail('pricing mode must be structured or free_text')
  if (b.free_text !== undefined) return fail('free_text is not allowed in structured pricing')

  const base = parseMoney('base_price', b.base_price, 1_000_000)
  if (!base.ok) return base
  const incl = parseIntIn('included_guests', b.included_guests, 1, 10000)
  if (!incl.ok) return incl
  const extraPrice = optionalOr(b.extra_guest_price, 0, x => parseMoney('extra_guest_price', x, 100_000))
  if (!extraPrice.ok) return extraPrice
  const pct = optionalOr(b.service_charge_pct, 0, x => parseMoney('service_charge_pct', x, 100))
  if (!pct.ok) return pct
  const label = optionalOr<string | null>(b.service_charge_label, null, x => parseNullableText('service_charge_label', x, SERVICE_LABEL_MAX))
  if (!label.ok) return label
  const dep = parseMoney('deposit_amount', b.deposit_amount, 2_000_000)
  if (!dep.ok) return dep

  // Package total = base + service charge, the charge rounded half up to the cent (integer cents, like the DB's numeric math).
  const baseC = Math.round(base.value * 100)
  const svcC = Math.floor((baseC * Math.round(pct.value * 100) + 5000) / 10000)
  if (Math.round(dep.value * 100) > baseC + svcC) return fail('deposit cannot be more than the package total')

  const days = optionalOr(b.balance_due_days, 0, x => parseIntIn('balance_due_days', x, 0, 365))
  if (!days.ok) return days
  return pass({
    mode: 'structured', base_price: base.value, included_guests: incl.value, extra_guest_price: extraPrice.value,
    service_charge_pct: pct.value, service_charge_label: label.value, deposit_amount: dep.value,
    balance_due_days: days.value, notes: notes.value,
  })
}

// ---- draft save ----

export interface PackageMeta {
  title?: string
  subtitle?: string | null
  description?: string | null
  cover_image_url?: string | null
  magazine_url?: string | null
  price_note?: string | null
  min_guests?: number | null
  max_guests?: number | null
  pricing_terms?: PricingTermsInput | null
}

const META_KEYS = [
  'title', 'subtitle', 'description', 'cover_image_url', 'magazine_url', 'price_note', 'min_guests', 'max_guests',
  'pricing_terms',
] as const

function validateMeta(v: unknown): Validated<PackageMeta> {
  const o = asObject(v, 'meta')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, META_KEYS)
  if (extra) return fail(extra)
  const b = o.value
  const meta: PackageMeta = {}
  if (b.title !== undefined) { const r = parseText('title', b.title, L.title); if (!r.ok) return r; meta.title = r.value }
  if (b.subtitle !== undefined) { const r = parseNullableText('subtitle', b.subtitle, L.subtitle); if (!r.ok) return r; meta.subtitle = r.value }
  if (b.description !== undefined) { const r = parseNullableText('description', b.description, L.description); if (!r.ok) return r; meta.description = r.value }
  if (b.cover_image_url !== undefined) { const r = parseHttps('cover_image_url', b.cover_image_url); if (!r.ok) return r; meta.cover_image_url = r.value }
  if (b.magazine_url !== undefined) { const r = parseHttps('magazine_url', b.magazine_url); if (!r.ok) return r; meta.magazine_url = r.value }
  if (b.price_note !== undefined) { const r = parseNullableText('price_note', b.price_note, L.priceNote); if (!r.ok) return r; meta.price_note = r.value }
  if (b.min_guests !== undefined) { const r = parseNullableInt('min_guests', b.min_guests, L.guestsMin, L.guestsMax); if (!r.ok) return r; meta.min_guests = r.value }
  if (b.max_guests !== undefined) { const r = parseNullableInt('max_guests', b.max_guests, L.guestsMin, L.guestsMax); if (!r.ok) return r; meta.max_guests = r.value }
  if (b.pricing_terms !== undefined) { const r = validatePricingTerms(b.pricing_terms); if (!r.ok) return r; meta.pricing_terms = r.value }
  if (Object.keys(meta).length === 0) return fail('meta must contain at least one field')
  if (typeof meta.min_guests === 'number' && typeof meta.max_guests === 'number' && meta.min_guests > meta.max_guests) {
    return fail('min_guests cannot be greater than max_guests')
  }
  return pass(meta)
}

export interface OptionInput {
  id?: string
  catalog_item_id: string
  service_id: string | null
  is_default: boolean
}

export interface ComponentInput {
  id?: string
  slot_label: string
  requirement: Requirement
  quantity: number
  notes: string | null
  options?: OptionInput[]
}

const COMPONENT_KEYS = ['id', 'slot_label', 'requirement', 'quantity', 'notes', 'options'] as const
const OPTION_KEYS = ['id', 'catalog_item_id', 'service_id', 'is_default'] as const

function parseOption(raw: unknown, seenOptionIds: Set<string>): Validated<OptionInput> {
  const o = asObject(raw, 'option')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, OPTION_KEYS)
  if (extra) return fail(extra)
  const b = o.value
  const out: OptionInput = { catalog_item_id: '', service_id: null, is_default: false }
  if (b.id !== undefined) {
    if (!isUuid(b.id)) return fail('id must be a valid uuid')
    const id = b.id.toLowerCase()
    if (seenOptionIds.has(id)) return fail('duplicate option ids')
    seenOptionIds.add(id)
    out.id = id
  }
  if (!isUuid(b.catalog_item_id)) return fail('catalog_item_id must be a valid uuid')
  out.catalog_item_id = b.catalog_item_id.toLowerCase()
  if (b.service_id !== undefined && b.service_id !== null) {
    if (!isUuid(b.service_id)) return fail('service_id must be a valid uuid or null')
    out.service_id = b.service_id.toLowerCase()
  }
  if (b.is_default !== undefined) {
    if (typeof b.is_default !== 'boolean') return fail('is_default must be a boolean')
    out.is_default = b.is_default
  }
  return pass(out)
}

// requirement and quantity default when omitted (the SQL coalesces the same way), so an omitted
// value on an existing component resets it to the default rather than leaving it untouched.
function parseComponent(raw: unknown, seenCompIds: Set<string>, seenOptionIds: Set<string>): Validated<ComponentInput> {
  const o = asObject(raw, 'component')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, COMPONENT_KEYS)
  if (extra) return fail(extra)
  const b = o.value
  const slot = parseText('slot_label', b.slot_label, L.slotLabel)
  if (!slot.ok) return slot
  const out: ComponentInput = { slot_label: slot.value, requirement: 'required', quantity: 1, notes: null }

  if (b.id !== undefined) {
    if (!isUuid(b.id)) return fail('id must be a valid uuid')
    const id = b.id.toLowerCase()
    if (seenCompIds.has(id)) return fail('duplicate component ids')
    seenCompIds.add(id)
    out.id = id
  }
  if (b.requirement !== undefined) {
    if (typeof b.requirement !== 'string' || !(REQUIREMENTS as readonly string[]).includes(b.requirement)) {
      return fail(`requirement must be one of: ${REQUIREMENTS.join(', ')}`)
    }
    out.requirement = b.requirement as Requirement
  }
  if (b.quantity !== undefined) {
    const q = parseIntIn('quantity', b.quantity, 1, L.quantityMax)
    if (!q.ok) return q
    out.quantity = q.value
  }
  if (b.notes !== undefined) {
    const n = parseNullableText('notes', b.notes, L.notes)
    if (!n.ok) return n
    out.notes = n.value
  }
  if (b.options !== undefined) {
    if (!Array.isArray(b.options)) return fail('options must be an array')
    if (b.options.length > L.options) return fail(`a component can have at most ${L.options} options`)
    const opts: OptionInput[] = []
    for (let j = 0; j < b.options.length; j++) {
      const r = prefixed(`options[${j}]`, parseOption(b.options[j], seenOptionIds))
      if (!r.ok) return r
      opts.push(r.value)
    }
    if (opts.filter(x => x.is_default).length > 1) return fail('a component can have only one default option')
    out.options = opts
  }
  return pass(out)
}

function validateComponents(v: unknown): Validated<ComponentInput[]> {
  if (!Array.isArray(v)) return fail('components must be an array')
  if (v.length > L.components) return fail(`a package can have at most ${L.components} components`)
  const seenComp = new Set<string>()
  const seenOpt = new Set<string>()
  const out: ComponentInput[] = []
  for (let i = 0; i < v.length; i++) {
    const r = prefixed(`components[${i}]`, parseComponent(v[i], seenComp, seenOpt))
    if (!r.ok) return r
    out.push(r.value)
  }
  return pass(out)
}

export function validateSaveDraft(raw: unknown): Validated<{
  expected_revision: number
  meta?: PackageMeta
  components?: ComponentInput[]
}> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  // The actor is never read from the body: any actor-like key is just an unknown field.
  const extra = unknownKeys(o.value, ['expected_revision', 'meta', 'components'])
  if (extra) return fail(extra)
  const rev = parseRevision(o.value.expected_revision)
  if (!rev.ok) return rev

  const out: { expected_revision: number; meta?: PackageMeta; components?: ComponentInput[] } = {
    expected_revision: rev.value,
  }
  if (o.value.meta !== undefined) {
    const m = validateMeta(o.value.meta)
    if (!m.ok) return m
    out.meta = m.value
  }
  if (o.value.components !== undefined) {
    const c = validateComponents(o.value.components)
    if (!c.ok) return c
    out.components = c.value
  }
  if (out.meta === undefined && out.components === undefined) return fail('Provide meta and/or components')
  return pass(out)
}
