// Pure UI logic for the admin request inbox. Kept free of React so it can be unit tested.
// The server already decides visibility and redaction; nothing here infers or filters.

import { INBOX_SCOPES, INBOX_STATUSES, type InboxScope, type InboxStatus } from '@/lib/request-inbox-api'
import { formatUsd } from '@/lib/package-page-format'

export const PAGE_SIZE = 25
const MAX_PAGE = 4001 // the API caps offset at 100000

const STATUS_LABELS: Record<InboxStatus, string> = {
  pending: 'New',
  in_progress: 'In progress',
  date_confirmed: 'Date confirmed',
  deposit_requested: 'Deposit requested',
  deposit_received: 'Deposit received',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
}

export const statusLabel = (s: unknown): string => STATUS_LABELS[s as InboxStatus] ?? 'Unknown'

export const STATUS_OPTIONS = INBOX_STATUSES.map(value => ({ value, label: STATUS_LABELS[value] }))
export const SCOPE_LABELS: Record<InboxScope, string> = { all: 'All', mine: 'Mine', unassigned: 'Unassigned' }

// ---- URL state ----

export interface InboxView { scope: InboxScope; status: InboxStatus | null; page: number }

export function parseInboxParams(sp: URLSearchParams): InboxView {
  const scope = sp.get('scope')
  const status = sp.get('status')
  const rawPage = sp.get('page')
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1
  return {
    scope: (INBOX_SCOPES as readonly string[]).includes(scope ?? '') ? (scope as InboxScope) : 'all',
    status: (INBOX_STATUSES as readonly string[]).includes(status ?? '') ? (status as InboxStatus) : null,
    page: page >= 1 && page <= MAX_PAGE ? page : 1,
  }
}

/** '?scope=mine&status=pending&page=2'; defaults are omitted; '' when everything is default. */
export function buildInboxQuery(v: InboxView): string {
  const p = new URLSearchParams()
  if (v.scope !== 'all') p.set('scope', v.scope)
  if (v.status) p.set('status', v.status)
  if (v.page > 1) p.set('page', String(v.page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** Query string for GET /api/v1/admin/requests (no leading '?'). */
export function buildApiQuery(v: InboxView): string {
  const p = new URLSearchParams()
  p.set('scope', v.scope)
  if (v.status) p.set('status', v.status)
  p.set('limit', String(PAGE_SIZE))
  p.set('offset', String((v.page - 1) * PAGE_SIZE))
  return p.toString()
}

// ---- list ----

export type ListState = 'rows' | 'empty' | 'past_end'
export const listState = (rowCount: number, page: number): ListState =>
  rowCount > 0 ? 'rows' : page > 1 ? 'past_end' : 'empty'

export const hasNextPage = (page: number, total: number): boolean => page * PAGE_SIZE < total

// ---- nav badge ----

export function badgeText(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null
  return count > 9 ? '9+' : String(Math.floor(count))
}

// ---- contact card ----

export type ContactRow = { label: 'Name' | 'Phone' | 'Email' | 'Notes'; value: string; note?: string }
export type ContactCard = { state: 'redacted' } | { state: 'visible'; rows: ContactRow[] }

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

/** The server sends a contact object only to people allowed to see it; null means redacted. */
export function contactCard(contact: unknown): ContactCard {
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return { state: 'redacted' }
  const c = contact as Record<string, unknown>
  const rows: ContactRow[] = []
  const name = text(c.name)
  const phone = text(c.phone)
  const email = text(c.email)
  const notes = text(c.notes)
  if (name) rows.push({ label: 'Name', value: name })
  if (phone) rows.push({ label: 'Phone', value: phone })
  if (email) {
    const note = c.email_verified === true ? undefined : c.guest === true ? 'Guest, not verified' : 'Not verified'
    rows.push(note ? { label: 'Email', value: email, note } : { label: 'Email', value: email })
  }
  if (notes) rows.push({ label: 'Notes', value: notes })
  return { state: 'visible', rows }
}

// ---- package items ----

// Values written by theme_package_build_snapshot (migration 20261104100008):
//   price_status:    'priced' | 'free' | 'quote'
//   price_treatment: 'listed' | 'free' | 'quote'
// The status decides the text. A 'listed' treatment can still have status 'quote' (per-person
// price with no guest count), so the treatment never overrides the status.
export function itemPriceText(item: { price_status?: unknown; line_total?: unknown }): string {
  if (item.price_status === 'priced' && typeof item.line_total === 'number' && Number.isFinite(item.line_total)) {
    return formatUsd(item.line_total)
  }
  if (item.price_status === 'free') return 'Included'
  return 'Price on request' // 'quote', a priced line without a total, null, or any unknown value
}

// ---- plan (Plan My Event) ----

// The server returns `plan` to every viewer; it never carries contact data. This reads only the
// known keys, so nothing else in the object can reach the Plan card.
export interface PlanService { title: string; category: string | null }
/** A vendor added with "Add to Plan". category is a display label, or null when hidden. */
export interface PlanVendor { name: string; category: string | null }
export interface PlanCard { times: string | null; needs: string[]; vendors: PlanVendor[]; services: PlanService[] }

// vendors.type -> label. 'addon' covers many kinds of vendor, so it is hidden (name only).
const VENDOR_TYPE_LABELS: Record<string, string | null> = {
  venue: 'Venue', dj: 'DJ', photographer: 'Photographer', security: 'Security', bartender: 'Bartender', addon: null,
}

/** Label for a vendors.type value: known types mapped, 'addon' hidden, anything else title-cased. */
export function vendorTypeLabel(type: string | null): string | null {
  if (!type) return null
  const key = type.toLowerCase()
  if (key in VENDOR_TYPE_LABELS) return VENDOR_TYPE_LABELS[key]
  return key.split(/[\s_-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || null
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()
  return t === '' ? null : [...t].slice(0, max).join('')
}

function formatClock(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function planCard(plan: unknown): PlanCard | null {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return null
  const p = plan as Record<string, unknown>
  const start = typeof p.time_start === 'string' && HHMM.test(p.time_start) ? p.time_start : null
  const end = typeof p.time_end === 'string' && HHMM.test(p.time_end) ? p.time_end : null
  const times = start && end
    ? `${formatClock(start)} to ${formatClock(end)}`
    : start ? formatClock(start) : end ? `Until ${formatClock(end)}` : null
  const needs = (Array.isArray(p.needs) ? p.needs : [])
    .map(n => clean(n, 60)).filter((n): n is string => n !== null).slice(0, 20)
  const services = (Array.isArray(p.services) ? p.services : []).flatMap((s): PlanService[] => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return []
    const o = s as Record<string, unknown>
    const title = clean(o.title, 120)
    return title ? [{ title, category: clean(o.category, 60) }] : []
  }).slice(0, 30)
  const vendors = (Array.isArray(p.vendors) ? p.vendors : []).flatMap((v): PlanVendor[] => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return []
    const o = v as Record<string, unknown>
    const name = clean(o.name, 60)
    return name ? [{ name, category: vendorTypeLabel(clean(o.category, 60)) }] : []
  }).slice(0, 20)
  return times || needs.length > 0 || vendors.length > 0 || services.length > 0
    ? { times, needs, vendors, services }
    : null
}

/** The customer's name as sent by the server (names only; phone, email and notes stay in `contact`). */
export const customerName = (v: unknown): string | null => clean(v, 120)
