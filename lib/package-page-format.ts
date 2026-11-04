// Pure formatting helpers for the package page. All money text is built here, in one place.

import type { PublicPricing, PublicSnapshotItem } from '@/lib/theme-package-public'

const WHOLE = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatUsd(n: number): string {
  return Number.isInteger(n) ? WHOLE.format(n) : CENTS.format(n)
}

export interface LinePrice {
  text: string
  detail: string | null
  tone: 'price' | 'free' | 'quote'
}

export const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** What the document says about an option, before (or without) a preview line. */
export function describePricing(p: PublicPricing): LinePrice {
  if (p.treatment === 'listed' && p.price != null) {
    return { text: formatUsd(p.price), detail: p.pricing_model === 'per_person' ? 'per guest' : null, tone: 'price' }
  }
  if (p.treatment === 'free') return { text: 'Included', detail: 'at no charge', tone: 'free' }
  return { text: 'Price on request', detail: null, tone: 'quote' }
}

/** A line from the server preview when there is one, otherwise the document pricing. */
export function describeLine(item: PublicSnapshotItem | undefined, fallback: PublicPricing): LinePrice {
  if (!item || !item.price_status) return describePricing(fallback)
  if (item.price_status === 'priced' && item.line_total != null) {
    const detail =
      item.pricing_model === 'per_person' ? 'total for your group' : item.quantity && item.quantity > 1 ? `× ${item.quantity}` : null
    return { text: formatUsd(item.line_total), detail, tone: 'price' }
  }
  if (item.price_status === 'free') return { text: 'Included', detail: 'at no charge', tone: 'free' }
  const note = item.price_note && item.price_note.toLowerCase() !== 'price on request' ? capitalizeFirst(item.price_note) : null
  return { text: 'Price on request', detail: note, tone: 'quote' }
}

export function quoteLineNote(count: number | null | undefined): string | null {
  if (!count || count < 1) return null
  return count === 1 ? '+ 1 item priced on request' : `+ ${count} items priced on request`
}

export function guestRangeLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? `${min} guests` : `${min}–${max} guests`
  if (max != null) return `Up to ${max} guests`
  if (min != null) return `${min}+ guests`
  return null
}

export function shortReference(requestId: string): string {
  return `REQ-${requestId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
