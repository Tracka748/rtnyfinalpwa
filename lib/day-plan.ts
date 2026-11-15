// Saved day plans: the save payload, its validation, the stored row, and the read-side normaliser.
// Pure functions only (no I/O), shared by the save route, the dashboard read and both planner screens.
//
// Trust model: everything in the payload comes from the browser. The route takes user_id from the
// session, recomputes the totals from the validated stops, sets status to the server constant
// 'saved', and never accepts ids, user ids, totals, status or image URLs from the client. Stops keep business_id only; logos are resolved from
// public.businesses at read time.

import { BUDGET_OPTIONS, ENERGY_OPTIONS, GROUP_OPTIONS, TAGS, TRANSPORT_OPTIONS } from '@/lib/day-plan-options'
import { isUuid, type Validated } from '@/lib/catalog-validation'
import { countChars } from '@/lib/request-limits'

export const DAY_PLAN_LIMITS = {
  BODY_BYTES: 32 * 1024,
  STOPS_MAX: 15,
  PLANS_PER_USER: 50,
  NAME_MAX: 120,
  CATEGORY_MAX: 50,
  ADDRESS_MAX: 200,
  SPEND_MAX: 5000,
  DURATION_MAX: 1440,
  DAYS_BACK: 2,
  DAYS_AHEAD: 366,
} as const

export const SEGMENTS = ['afternoon', 'evening', 'night'] as const
export type Segment = (typeof SEGMENTS)[number]

// Allowlists derived from the UI's own option lists (lib/day-plan-options.ts).
export const ALLOWED = {
  budget: BUDGET_OPTIONS.map(o => o.label),
  energy: ENERGY_OPTIONS.map(o => o.value),
  group: GROUP_OPTIONS.map(o => o.value),
  tags: TAGS.map(o => o.value),
  transport: TRANSPORT_OPTIONS.map(o => o.value),
}

export interface SaveStop {
  business_id: string | null
  name: string
  category: string
  address: string | null
  estimated_arrival: string | null // 'HH:MM'
  duration_minutes: number
  estimated_spend: number
  segment: Segment | null
}

export interface SavePayload {
  plan_date: string
  stops: SaveStop[]
  budget: string | null
  energy_type: string | null
  group_type: string[]
  tags: string[]
  time_start: string | null
  time_end: string | null
  transportation: string | null
}

const BODY_KEYS = ['plan_date', 'stops', 'budget', 'energy_type', 'group_type', 'tags', 'time_start', 'time_end', 'transportation']
const STOP_KEYS = ['business_id', 'name', 'category', 'address', 'estimated_arrival', 'duration_minutes', 'estimated_spend', 'segment']

// ---- small parsers ----

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** '14:05' stays; '2:05 PM' / '2:05pm' / '9:30' become 'HH:MM'; anything else is null. */
export function toHHMM(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (HHMM_RE.test(s)) return s
  const m = /^(\d{1,2}):([0-5]\d)\s*([AaPp][Mm])?$/.exec(s)
  if (!m) return null
  let h = Number(m[1])
  if (m[3]) {
    if (h < 1 || h > 12) return null
    const pm = m[3].toLowerCase() === 'pm'
    h = (h % 12) + (pm ? 12 : 0)
  }
  if (h > 23) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000)
}

function text(field: string, v: unknown, max: number, required: boolean): Validated<string | null> {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    return required ? { ok: false, error: `${field} is required` } : { ok: true, value: null }
  }
  if (typeof v !== 'string') return { ok: false, error: `${field} must be a string` }
  const t = v.trim()
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(t)) return { ok: false, error: `${field} has invalid characters` }
  if (countChars(t) > max) return { ok: false, error: `${field} is too long` }
  return { ok: true, value: t }
}

function oneOf(field: string, v: unknown, allowed: readonly string[]): Validated<string | null> {
  if (v === undefined || v === null || v === '') return { ok: true, value: null }
  return typeof v === 'string' && allowed.includes(v) ? { ok: true, value: v } : { ok: false, error: `${field} is not allowed` }
}

function listOf(field: string, v: unknown, allowed: readonly string[]): Validated<string[]> {
  if (v === undefined || v === null) return { ok: true, value: [] }
  if (!Array.isArray(v) || v.length > allowed.length) return { ok: false, error: `${field} must be a short list` }
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string' || !allowed.includes(x)) return { ok: false, error: `${field} has a value that is not allowed` }
    if (!out.includes(x)) out.push(x)
  }
  return { ok: true, value: out }
}

function optTime(field: string, v: unknown): Validated<string | null> {
  if (v === undefined || v === null || v === '') return { ok: true, value: null }
  return typeof v === 'string' && HHMM_RE.test(v) ? { ok: true, value: v } : { ok: false, error: `${field} must be HH:MM` }
}

function num(field: string, v: unknown, max: number, integer: boolean): Validated<number> {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) return { ok: false, error: `${field} is out of range` }
  if (integer && !Number.isInteger(v)) return { ok: false, error: `${field} must be a whole number` }
  return { ok: true, value: integer ? v : Math.round(v * 100) / 100 }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function parseStop(v: unknown, i: number): Validated<SaveStop> {
  const f = (k: string) => `stops[${i}].${k}`
  if (!isPlainObject(v)) return { ok: false, error: `stops[${i}] must be an object` }
  if (Object.keys(v).some(k => !STOP_KEYS.includes(k))) return { ok: false, error: `stops[${i}] has unknown fields` }

  let business_id: string | null = null
  const rawId = v.business_id
  if (rawId !== undefined && rawId !== null) {
    if (!isUuid(rawId)) return { ok: false, error: `${f('business_id')} must be a valid uuid` }
    business_id = rawId.toLowerCase()
  }
  const name = text(f('name'), v.name, DAY_PLAN_LIMITS.NAME_MAX, true); if (!name.ok) return name
  const category = text(f('category'), v.category, DAY_PLAN_LIMITS.CATEGORY_MAX, true); if (!category.ok) return category
  const address = text(f('address'), v.address, DAY_PLAN_LIMITS.ADDRESS_MAX, false); if (!address.ok) return address
  const arrival = optTime(f('estimated_arrival'), v.estimated_arrival); if (!arrival.ok) return arrival
  const duration = num(f('duration_minutes'), v.duration_minutes, DAY_PLAN_LIMITS.DURATION_MAX, true); if (!duration.ok) return duration
  const spend = num(f('estimated_spend'), v.estimated_spend, DAY_PLAN_LIMITS.SPEND_MAX, false); if (!spend.ok) return spend
  const segment = oneOf(f('segment'), v.segment, SEGMENTS); if (!segment.ok) return segment

  return {
    ok: true,
    value: {
      business_id,
      name: name.value as string,
      category: category.value as string,
      address: address.value,
      estimated_arrival: arrival.value,
      duration_minutes: duration.value,
      estimated_spend: spend.value,
      segment: segment.value as Segment | null,
    },
  }
}

/** Validates the raw request body text. `now` decides the allowed plan_date window. */
export function parseSaveBody(raw: string, now: Date = new Date()): Validated<SavePayload> {
  if (new TextEncoder().encode(raw).length > DAY_PLAN_LIMITS.BODY_BYTES) return { ok: false, error: 'body is too large' }
  let body: unknown
  try { body = JSON.parse(raw) } catch { return { ok: false, error: 'body must be valid JSON' } }
  if (!isPlainObject(body)) return { ok: false, error: 'body must be a JSON object' }
  if (Object.keys(body).some(k => !BODY_KEYS.includes(k))) return { ok: false, error: 'body has unknown fields' }

  const planDate = body.plan_date
  if (typeof planDate !== 'string' || !isRealDate(planDate)) return { ok: false, error: 'plan_date must be a real YYYY-MM-DD date' }
  const offset = dayNumber(new Date(planDate + 'T00:00:00Z')) - dayNumber(now)
  if (offset < -DAY_PLAN_LIMITS.DAYS_BACK || offset > DAY_PLAN_LIMITS.DAYS_AHEAD) return { ok: false, error: 'plan_date is out of range' }

  if (!Array.isArray(body.stops) || body.stops.length < 1 || body.stops.length > DAY_PLAN_LIMITS.STOPS_MAX) {
    return { ok: false, error: `stops must have 1 to ${DAY_PLAN_LIMITS.STOPS_MAX} items` }
  }
  const stops: SaveStop[] = []
  for (let i = 0; i < body.stops.length; i++) {
    const s = parseStop(body.stops[i], i)
    if (!s.ok) return s
    stops.push(s.value)
  }

  const budget = oneOf('budget', body.budget, ALLOWED.budget); if (!budget.ok) return budget
  const energy = oneOf('energy_type', body.energy_type, ALLOWED.energy); if (!energy.ok) return energy
  const group = listOf('group_type', body.group_type, ALLOWED.group); if (!group.ok) return group
  const tags = listOf('tags', body.tags, ALLOWED.tags); if (!tags.ok) return tags
  const start = optTime('time_start', body.time_start); if (!start.ok) return start
  const end = optTime('time_end', body.time_end); if (!end.ok) return end
  const transport = oneOf('transportation', body.transportation, ALLOWED.transport); if (!transport.ok) return transport

  return {
    ok: true,
    value: {
      plan_date: planDate,
      stops,
      budget: budget.value,
      energy_type: energy.value,
      group_type: group.value,
      tags: tags.value,
      time_start: start.value,
      time_end: end.value,
      transportation: transport.value,
    },
  }
}

/**
 * Status of a plan saved through the save route. A server-side constant: the client can never send
 * a status (parseSaveBody rejects the key). Must be one of day_plans_status_check's values
 * ('generated', 'saved', 'completed'); the column default 'generated' is not used by this route.
 */
export const DAY_PLAN_SAVED_STATUS = 'saved' as const

/** The row the route inserts. Totals are computed here, never taken from the client. */
export function toInsertRow(userId: string, p: SavePayload) {
  const spend = Math.round(p.stops.reduce((s, x) => s + x.estimated_spend, 0) * 100) / 100
  const mins = p.stops.reduce((s, x) => s + x.duration_minutes, 0)
  return {
    user_id: userId,
    status: DAY_PLAN_SAVED_STATUS,
    plan_date: p.plan_date,
    stops: p.stops.map(s => ({
      stop: {
        business_id: s.business_id,
        name: s.name,
        category: s.category,
        address: s.address,
        estimated_arrival: s.estimated_arrival,
        duration_minutes: s.duration_minutes,
        estimated_spend: s.estimated_spend,
      },
      segment: s.segment,
      locked: false,
    })),
    budget_range: p.budget,
    energy_type: p.energy_type,
    group_type: p.group_type.length > 0 ? p.group_type.join(',') : null,
    tags: p.tags,
    time_start: p.time_start,
    time_end: p.time_end,
    transportation: p.transportation,
    total_estimated_spend: spend,
    total_duration_minutes: mins,
  }
}

// ---- client-side payload builders (one per screen) ----

/** Minimal shape of PlanMyDay's EnrichedStop that the payload needs. Image fields are ignored. */
export interface EnrichedStopLike {
  stop: {
    business_id?: string | null
    name: string
    category: string
    address: string | null
    estimated_arrival: string
    duration_minutes: number
    estimated_spend: number
  }
  segment: string
}

export interface PlannerFormLike {
  timeStart: string
  timeEnd: string
  budget: string
  energyType: string
  tags: string[]
  groupType: string[]
  transportation: string
}

const segmentOrNull = (s: unknown): Segment | null =>
  typeof s === 'string' && (SEGMENTS as readonly string[]).includes(s) ? (s as Segment) : null
const blankToNull = (s: unknown) => (typeof s === 'string' && s.trim() !== '' ? s : null)

export function buildPayloadFromEnriched(stops: EnrichedStopLike[], form: PlannerFormLike, planDate: string): SavePayload {
  return {
    plan_date: planDate,
    stops: stops.map(e => ({
      business_id: isUuid(e.stop.business_id) ? (e.stop.business_id as string) : null,
      name: e.stop.name,
      category: e.stop.category,
      address: e.stop.address ?? null,
      estimated_arrival: toHHMM(e.stop.estimated_arrival),
      duration_minutes: e.stop.duration_minutes,
      estimated_spend: e.stop.estimated_spend,
      segment: segmentOrNull(e.segment),
    })),
    budget: blankToNull(form.budget),
    energy_type: blankToNull(form.energyType),
    group_type: form.groupType,
    tags: form.tags,
    time_start: blankToNull(form.timeStart),
    time_end: blankToNull(form.timeEnd),
    transportation: blankToNull(form.transportation),
  }
}

/** Minimal shape of the confirm page's PendingDayPlan (sessionStorage), which may be stale or tampered. */
export interface PendingPlanLike {
  date: string
  stops: Array<{
    businessId?: string | null
    name: string
    category: string
    time: string
    address?: string
    estimatedSpend: number
    durationMinutes: number
    segment?: string
  }>
  preferences?: {
    groupType?: string | string[]
    transportation?: string
    energyType?: string
    tags?: string[]
    budget?: string
    timeStart?: string
    timeEnd?: string
  }
}

export function buildPayloadFromPending(plan: PendingPlanLike): SavePayload {
  const p = plan.preferences ?? {}
  const group = Array.isArray(p.groupType)
    ? p.groupType
    : typeof p.groupType === 'string' && p.groupType !== '' ? p.groupType.split(',') : []
  return {
    plan_date: plan.date,
    stops: (Array.isArray(plan.stops) ? plan.stops : []).map(s => {
      const id: unknown = s?.businessId
      return {
        business_id: isUuid(id) ? id : null,
        name: s?.name,
        category: s?.category,
        address: blankToNull(s?.address),
        estimated_arrival: toHHMM(s?.time),
        duration_minutes: s?.durationMinutes,
        estimated_spend: s?.estimatedSpend,
        segment: segmentOrNull(s?.segment),
      }
    }),
    budget: blankToNull(p.budget),
    energy_type: blankToNull(p.energyType),
    group_type: group,
    tags: Array.isArray(p.tags) ? p.tags : [],
    time_start: blankToNull(p.timeStart),
    time_end: blankToNull(p.timeEnd),
    transportation: blankToNull(p.transportation),
  }
}

// ---- read side ----

export interface SavedStopView {
  business_id: string | null
  name: string
  category: string
  address: string | null
  time: string | null // 'HH:MM'
  spend: number | null
  logo_url: string | null        // resolved from public.businesses only
  cover_image_url: string | null // resolved from public.businesses only
}

export interface SavedPlanView {
  id: string
  plan_date: string | null
  total_estimated_spend: number | null
  total_duration_minutes: number | null
  created_at: string | null
  stops: SavedStopView[]
}

const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null)
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Accepts the nested shape, the old flat confirm-page shape, or junk. Never reads image fields. */
function normalizeStop(raw: unknown): SavedStopView | null {
  if (!isPlainObject(raw)) return null
  const s = isPlainObject(raw.stop) ? raw.stop : raw
  const name = strOrNull(s.name)
  if (!name) return null
  const id = s.business_id
  return {
    business_id: isUuid(id) ? id.toLowerCase() : null,
    name,
    category: strOrNull(s.category) ?? '',
    address: strOrNull(s.address),
    time: toHHMM(s.estimated_arrival ?? s.time),
    spend: numOrNull(s.estimated_spend ?? s.estimatedSpend),
    logo_url: null,
    cover_image_url: null,
  }
}

export function normalizeSavedPlans(rows: unknown): SavedPlanView[] {
  if (!Array.isArray(rows)) return []
  const out: SavedPlanView[] = []
  for (const r of rows) {
    if (!isPlainObject(r) || typeof r.id !== 'string') continue
    const stops = Array.isArray(r.stops) ? r.stops.map(normalizeStop).filter((x): x is SavedStopView => x !== null) : []
    out.push({
      id: r.id,
      plan_date: strOrNull(r.plan_date),
      total_estimated_spend: numOrNull(typeof r.total_estimated_spend === 'string' ? Number(r.total_estimated_spend) : r.total_estimated_spend),
      total_duration_minutes: numOrNull(r.total_duration_minutes),
      created_at: strOrNull(r.created_at),
      stops,
    })
  }
  return out
}

/** Only http(s) URLs from the businesses table are used as images. */
export function safeImageUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.trim() === '') return null
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

export interface BusinessImages {
  logo_url: string | null
  cover_image_url: string | null
}

/** Builds the lookup from public.businesses rows. Only http(s) URLs survive. */
export function businessImageMap(rows: unknown): Map<string, BusinessImages> {
  const map = new Map<string, BusinessImages>()
  for (const b of Array.isArray(rows) ? rows : []) {
    if (!isPlainObject(b) || !isUuid(b.id)) continue
    const images = { logo_url: safeImageUrl(b.logo_url), cover_image_url: safeImageUrl(b.cover_image_url) }
    if (images.logo_url || images.cover_image_url) map.set((b.id as string).toLowerCase(), images)
  }
  return map
}

/** Sets each stop's images from the lookup only; anything already on the stop is overwritten. */
export function attachBusinessImages(plans: SavedPlanView[], images: Map<string, BusinessImages>): SavedPlanView[] {
  return plans.map(p => ({
    ...p,
    stops: p.stops.map(s => {
      const found = s.business_id ? images.get(s.business_id) : undefined
      return { ...s, logo_url: found?.logo_url ?? null, cover_image_url: found?.cover_image_url ?? null }
    }),
  }))
}
