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
