// Pure validators for the public / customer theme-package routes. No I/O, no Next imports.

import { isUuid, type Validated } from '@/lib/catalog-validation'

// Mirrors BUDGET_RANGES in components/custom/plan/EventDetailsForm.tsx (Plan My Event).
// The dashes are en dashes (U+2013). A test fails if the UI strings drift.
export const BUDGET_RANGES = ['Under $500', '$500–$1,000', '$1,000–$2,500', '$2,500–$5,000', '$5,000+'] as const
export type BudgetRange = (typeof BUDGET_RANGES)[number]

export const PUBLIC_LIMITS = {
  key: 64, occasion: 60, eventType: 80, notes: 2000, selection: 30, guestsMin: 1, guestsMax: 10000, maxOffset: 10000,
} as const
const L = PUBLIC_LIMITS

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const pass = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })

type Obj = Record<string, unknown>
const SLUG_RE = /^[a-z][a-z0-9_]*$/

export const isSlugKey = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= L.key && SLUG_RE.test(v)

/** The current date in UTC, YYYY-MM-DD (matches the DB's current_date on Supabase). */
export const todayUtc = (now: Date = new Date()): string => now.toISOString().slice(0, 10)

function asObject(v: unknown, what: string): Validated<Obj> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? pass(v as Obj) : fail(`${what} must be a JSON object`)
}

function unknownKeys(body: Obj, allowed: readonly string[]): string | null {
  const extra = Object.keys(body).filter(k => !allowed.includes(k))
  return extra.length ? `Unknown field(s): ${extra.slice(0, 5).map(k => k.slice(0, 40)).join(', ')}` : null
}

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

function parseDate(field: string, v: unknown): Validated<string> {
  return typeof v === 'string' && isRealDate(v) ? pass(v) : fail(`${field} must be a real date in YYYY-MM-DD format`)
}

function parseGuests(v: unknown): Validated<number> {
  return typeof v === 'number' && Number.isInteger(v) && v >= L.guestsMin && v <= L.guestsMax
    ? pass(v)
    : fail(`guest_count must be an integer from ${L.guestsMin} to ${L.guestsMax}`)
}

function parseOffset(raw: string | null): Validated<number> {
  if (raw === null || raw === '') return pass(0)
  const msg = `offset must be an integer from 0 to ${L.maxOffset}`
  if (!/^\d+$/.test(raw)) return fail(msg)
  const n = Number(raw)
  return n > L.maxOffset ? fail(msg) : pass(n)
}

// C0 controls (including tab and newline), DEL and C1 controls.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/

/** Optional. Absent, null, '' or whitespace-only -> null; otherwise an exact BUDGET_RANGES value. */
function parseOptionalBudget(v: unknown): Validated<BudgetRange | null> {
  if (v === undefined || v === null) return pass(null)
  const msg = `budget_range must be one of: ${BUDGET_RANGES.join(', ')}`
  if (typeof v !== 'string') return fail(msg)
  if (v.trim() === '') return pass(null)
  return (BUDGET_RANGES as readonly string[]).includes(v) ? pass(v as BudgetRange) : fail(msg)
}

/** Optional. Absent, null or blank -> null (the route then keeps the package occasion). */
function parseOptionalEventType(v: unknown): Validated<string | null> {
  if (v === undefined || v === null) return pass(null)
  if (typeof v !== 'string') return fail('event_type must be a string')
  if (CONTROL_CHARS_RE.test(v)) return fail('event_type cannot contain control characters')
  const s = v.trim()
  if (s === '') return pass(null)
  if (Array.from(s).length > L.eventType) return fail(`event_type must be at most ${L.eventType} characters`)
  return pass(s)
}

// ---- selection ----

export interface SelectionInput {
  components: Array<{ component_id: string; included?: boolean; option_id?: string }>
}

export function validateSelection(raw: unknown): Validated<SelectionInput> {
  const o = asObject(raw, 'selection')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['components'])
  if (extra) return fail(extra)
  if (o.value.components === undefined) return pass({ components: [] })
  if (!Array.isArray(o.value.components)) return fail('selection.components must be an array')
  if (o.value.components.length > L.selection) return fail(`selection.components can have at most ${L.selection} entries`)

  const seen = new Set<string>()
  const out: SelectionInput['components'] = []
  for (let i = 0; i < o.value.components.length; i++) {
    const e = asObject(o.value.components[i], `selection.components[${i}]`)
    if (!e.ok) return e
    const extraKeys = unknownKeys(e.value, ['component_id', 'included', 'option_id'])
    if (extraKeys) return fail(`selection.components[${i}]: ${extraKeys}`)
    if (!isUuid(e.value.component_id)) return fail(`selection.components[${i}]: component_id must be a valid uuid`)
    const component_id = e.value.component_id.toLowerCase()
    if (seen.has(component_id)) return fail('selection.components has duplicate component_id values')
    seen.add(component_id)
    const entry: SelectionInput['components'][number] = { component_id }
    if (e.value.included !== undefined) {
      if (typeof e.value.included !== 'boolean') return fail(`selection.components[${i}]: included must be a boolean`)
      entry.included = e.value.included
    }
    if (e.value.option_id !== undefined) {
      if (!isUuid(e.value.option_id)) return fail(`selection.components[${i}]: option_id must be a valid uuid`)
      entry.option_id = e.value.option_id.toLowerCase()
    }
    out.push(entry)
  }
  return pass({ components: out })
}

// ---- preview ----

/** Everything optional. The DB function enforces package rules (guest range, past dates, required parts). */
export function validatePreviewBody(raw: unknown): Validated<{
  selection: SelectionInput
  guest_count: number | null
  event_date: string | null
}> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  const extra = unknownKeys(o.value, ['selection', 'guest_count', 'event_date'])
  if (extra) return fail(extra)

  const selection = o.value.selection === undefined ? pass({ components: [] }) : validateSelection(o.value.selection)
  if (!selection.ok) return selection
  let guest_count: number | null = null
  if (o.value.guest_count !== undefined && o.value.guest_count !== null) {
    const g = parseGuests(o.value.guest_count)
    if (!g.ok) return g
    guest_count = g.value
  }
  let event_date: string | null = null
  if (o.value.event_date !== undefined && o.value.event_date !== null) {
    const d = parseDate('event_date', o.value.event_date)
    if (!d.ok) return d
    event_date = d.value
  }
  return pass({ selection: selection.value, guest_count, event_date })
}

// ---- request creation ----

export interface CreateRequestInput {
  version_id: string
  selection: SelectionInput
  event_date: string
  guest_count: number
  budget_range: BudgetRange | null // null when the customer left it out
  event_type: string | null // null = use the package occasion
  notes: string | null
  intent: 'reserve' | 'quote' // quote = the existing request-a-quote flow
}

export function validateCreateRequestBody(raw: unknown, today: string = todayUtc()): Validated<CreateRequestInput> {
  const o = asObject(raw, 'Request body')
  if (!o.ok) return o
  // No user id, email, price, service, partner or snapshot is ever read from the body:
  // any such key is simply an unknown field.
  const extra = unknownKeys(o.value, ['version_id', 'selection', 'event_date', 'guest_count', 'budget_range', 'event_type', 'notes', 'intent'])
  if (extra) return fail(extra)

  if (!isUuid(o.value.version_id)) return fail('version_id must be a valid uuid')
  const selection = o.value.selection === undefined ? pass({ components: [] }) : validateSelection(o.value.selection)
  if (!selection.ok) return selection
  const date = parseDate('event_date', o.value.event_date)
  if (!date.ok) return date
  if (date.value < today) return fail('event_date cannot be in the past')
  const guests = parseGuests(o.value.guest_count)
  if (!guests.ok) return guests
  const budget = parseOptionalBudget(o.value.budget_range)
  if (!budget.ok) return budget
  const eventType = parseOptionalEventType(o.value.event_type)
  if (!eventType.ok) return eventType
  const intent = o.value.intent === undefined ? 'quote' : o.value.intent
  if (intent !== 'reserve' && intent !== 'quote') return fail('intent must be reserve or quote')
  let notes: string | null = null
  if (o.value.notes !== undefined && o.value.notes !== null) {
    if (typeof o.value.notes !== 'string') return fail('notes must be a string or null')
    const s = o.value.notes.trim()
    if (s.length > L.notes) return fail(`notes must be at most ${L.notes} characters`)
    notes = s || null
  }
  return pass({
    version_id: o.value.version_id.toLowerCase(),
    selection: selection.value,
    event_date: date.value,
    guest_count: guests.value,
    budget_range: budget.value,
    event_type: eventType.value,
    notes,
    intent,
  })
}

// ---- query strings ----

export function validateLiveListQuery(sp: URLSearchParams): Validated<{ occasion?: string; theme_id?: string; offset: number }> {
  const out: { occasion?: string; theme_id?: string; offset: number } = { offset: 0 }
  const occasion = (sp.get('occasion') ?? '').trim()
  if (occasion) {
    if (occasion.length > L.occasion) return fail(`occasion must be at most ${L.occasion} characters`)
    out.occasion = occasion
  }
  const theme = sp.get('theme_id')
  if (theme) {
    if (!isUuid(theme)) return fail('theme_id must be a valid uuid')
    out.theme_id = theme.toLowerCase()
  }
  const offset = parseOffset(sp.get('offset'))
  if (!offset.ok) return offset
  out.offset = offset.value
  return pass(out)
}

export function validateOffsetQuery(sp: URLSearchParams): Validated<{ offset: number }> {
  const offset = parseOffset(sp.get('offset'))
  return offset.ok ? pass({ offset: offset.value }) : offset
}
