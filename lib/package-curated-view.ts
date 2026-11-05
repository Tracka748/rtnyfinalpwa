// Pure view-model for the curated package page. No React, no I/O.

import { formatUsd } from '@/lib/package-page-format'
import { initialSelection, type SelectionState } from '@/lib/package-selection'
import type { LiveDocument } from '@/lib/theme-package-public'

export interface IncludedItem {
  componentId: string
  name: string
  quantity: number
  providerName: string | null
  /** The DEFAULT option itself is unavailable (that is the option a reservation books). */
  unavailable: boolean
}

/**
 * Required and optional_on components, showing the DEFAULT option. Availability is read from that
 * option's own `available` flag, never from a swap candidate and never from the component-level flag.
 */
export function includedItems(doc: LiveDocument): IncludedItem[] {
  return doc.components
    .filter(c => c.requirement !== 'optional_off')
    .map(c => {
      const def = c.options.find(o => o.is_default)
      return {
        componentId: c.id,
        name: def?.item?.name ?? 'To be assigned',
        quantity: c.quantity,
        providerName: def?.provider?.name ?? null,
        unavailable: !(def?.available ?? false),
      }
    })
}

export type PrimaryAction =
  | { kind: 'reserve'; label: 'Reserve your date'; sublabel: string | null; disabled: false }
  | { kind: 'customize'; label: 'Customize & request a quote'; sublabel: null; disabled: false }
  | { kind: 'unavailable'; label: 'Currently unavailable'; sublabel: null; disabled: true }

const UNAVAILABLE: PrimaryAction = { kind: 'unavailable', label: 'Currently unavailable', sublabel: null, disabled: true }

export function primaryAction(doc: LiveDocument): PrimaryAction {
  if (!doc.requestable) return UNAVAILABLE
  if (doc.pricing === null) return { kind: 'customize', label: 'Customize & request a quote', sublabel: null, disabled: false }
  // A reservation books the curated defaults, so an included item whose default is unavailable blocks it.
  if (includedItems(doc).some(i => i.unavailable)) return UNAVAILABLE
  const deposit = doc.pricing.mode === 'structured' ? doc.pricing.terms?.deposit_amount ?? 0 : 0
  return {
    kind: 'reserve',
    label: 'Reserve your date',
    sublabel: deposit > 0 ? `${formatUsd(deposit)} deposit to reserve` : null,
    disabled: false,
  }
}

export const showCustomizeLink = (doc: LiveDocument): boolean => doc.pricing !== null && doc.requestable
/** Per-item prices appear in the curated view only for packages without pricing terms. */
export const showItemPrices = (doc: LiveDocument): boolean => doc.pricing === null

/** Customize-mode subtotal: never "$0" when something is priced on request. */
export function customizeSubtotalText(subtotal: number | null, unpriced: number | null): string {
  if (subtotal == null) return '—'
  if (subtotal === 0) return (unpriced ?? 0) > 0 ? 'Price on request' : 'Included'
  return formatUsd(subtotal)
}

export function curatedBarText(
  doc: LiveDocument,
  listed: { subtotal: number | null; unpriced: number | null } | null
): { caption: string | null; text: string } {
  const p = doc.pricing
  if (p?.mode === 'structured' && p.terms) {
    const n = p.terms.included_guests
    return { caption: null, text: `Starting at ${formatUsd(p.terms.base_price)} for ${n} ${n === 1 ? 'guest' : 'guests'}` }
  }
  if (p) return { caption: null, text: doc.meta.title } // free-text pricing
  return { caption: 'Listed subtotal', text: listed ? customizeSubtotalText(listed.subtotal, listed.unpriced) : '—' }
}

/** Blank-line separated paragraphs; single line breaks inside a paragraph are kept for the renderer. */
export function toParagraphs(text: string): string[] {
  return text.split(/\r?\n[ \t]*\r?\n/).map(s => s.trim()).filter(Boolean)
}

/** True while the selection is exactly the curated defaults. */
export function isCuratedSelection(doc: LiveDocument, sel: SelectionState): boolean {
  return Object.entries(initialSelection(doc)).every(([id, c]) => sel[id]?.included === c.included && sel[id]?.optionId === c.optionId)
}

// ---- customize-mode bar ----

export type PreviewStatus = 'loading' | 'ready' | 'rejected' | 'error' | 'not_found'

/** The left side of the customize-mode bar. Rejected messages are shown by the caller in the note slot. */
export function customizeBarText(input: {
  requestable: boolean
  status: PreviewStatus
  subtotal: number | null
  unpriced: number | null
  rejectedMessage?: string
}): { text: string; note: string | null; dim: boolean } {
  const { requestable, status, subtotal, unpriced } = input
  if (!requestable) return { text: 'Unavailable right now', note: null, dim: true }
  if (status === 'error' || status === 'not_found') return { text: 'Price unavailable right now', note: null, dim: true }
  if (status === 'rejected') return { text: 'This combination isn’t available', note: input.rejectedMessage || null, dim: true }
  const text = customizeSubtotalText(subtotal, unpriced)
  const note = subtotal != null && subtotal > 0 && unpriced && unpriced > 0
    ? (unpriced === 1 ? '+ 1 item priced on request' : `+ ${unpriced} items priced on request`)
    : null
  return { text, note, dim: status === 'loading' }
}
