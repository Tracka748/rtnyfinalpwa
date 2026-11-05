// Pure builder for the public `pricing` block of a package document. No I/O.
// The text lines are generated here, server-side, so every client shows the same wording.

import { formatUsd } from '@/lib/package-page-format'

export interface PublicPricingTerms {
  base_price: number
  included_guests: number
  extra_guest_price: number
  service_charge_pct: number
  service_charge_label: string | null
  deposit_amount: number
  balance_due_days: number
}

export interface PublicPackagePricing {
  mode: 'structured' | 'free_text'
  reservable: boolean
  /** Generated lines only (base, extra guest, service charge, deposit, balance). Notes are separate. */
  lines: string[]
  notes: string[]
  free_text?: string
  terms?: PublicPricingTerms
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Normalized pricing_terms (as stored) -> public block. Null for no terms or anything unusable. */
export function buildPricing(raw: unknown): PublicPackagePricing | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const t = raw as Record<string, unknown>
  const notes = (Array.isArray(t.notes) ? t.notes : []).filter((x): x is string => typeof x === 'string')

  if (t.mode === 'free_text') {
    return typeof t.free_text === 'string'
      ? { mode: 'free_text', reservable: true, lines: [], notes, free_text: t.free_text }
      : null
  }
  if (t.mode !== 'structured') return null

  const base = num(t.base_price)
  const included = num(t.included_guests)
  const deposit = num(t.deposit_amount)
  if (base === null || included === null || deposit === null) return null
  const extra = num(t.extra_guest_price) ?? 0
  const pct = num(t.service_charge_pct) ?? 0
  const days = num(t.balance_due_days) ?? 0
  const label = typeof t.service_charge_label === 'string' && t.service_charge_label.trim() ? t.service_charge_label.trim() : null

  const lines = [`${formatUsd(base)} for ${plural(included, 'guest')}`]
  if (extra > 0) lines.push(`${formatUsd(extra)} for each additional guest`)
  if (pct > 0) lines.push(`${pct}% ${label ?? 'service charge'}`)
  if (deposit > 0) {
    lines.push(`${formatUsd(deposit)} deposit required to reserve the date`)
    lines.push(days === 0 ? 'Remaining balance due on the day of the event' : `Remaining balance due ${plural(days, 'day')} before the event`)
  }

  return {
    mode: 'structured',
    reservable: true,
    lines,
    notes,
    terms: {
      base_price: base, included_guests: included, extra_guest_price: extra, service_charge_pct: pct,
      service_charge_label: label, deposit_amount: deposit, balance_due_days: days,
    },
  }
}
