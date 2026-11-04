// Pure selection model for the package page. No React.

import type { LiveDocument, PublicComponent, PublicOption } from '@/lib/theme-package-public'
import type { SelectionInput } from '@/lib/theme-package-public-validation'

export interface ComponentChoice { included: boolean; optionId: string }
export type SelectionState = Readonly<Record<string, ComponentChoice>>

export const GUEST_LIMITS = { min: 1, max: 10000 } as const

const norm = (s: string) => s.trim().toLowerCase()

export const isRequired = (c: PublicComponent) => c.requirement === 'required'
export const availableOptions = (c: PublicComponent): PublicOption[] => c.options.filter(o => o.available)
export const isSwappable = (c: PublicComponent) => availableOptions(c).length > 1
export const canToggle = (c: PublicComponent) => !isRequired(c) && availableOptions(c).length > 0

/** The default option when it is available, otherwise the first available one. */
export function preselectedOption(c: PublicComponent): PublicOption | undefined {
  const available = availableOptions(c)
  return available.find(o => o.is_default) ?? available[0]
}

function initialChoice(c: PublicComponent): ComponentChoice {
  const opt = preselectedOption(c)
  const optionId = opt?.id ?? ''
  if (isRequired(c)) return { included: true, optionId }
  if (!opt) return { included: false, optionId }
  return { included: c.requirement === 'optional_on', optionId }
}

export function initialSelection(doc: LiveDocument): SelectionState {
  return Object.fromEntries(doc.components.map(c => [c.id, initialChoice(c)]))
}

export function selectedOption(doc: LiveDocument, state: SelectionState, componentId: string): PublicOption | undefined {
  const c = doc.components.find(x => x.id === componentId)
  const choice = state[componentId]
  return c && choice ? c.options.find(o => o.id === choice.optionId) : undefined
}

export function toggleOptional(state: SelectionState, doc: LiveDocument, componentId: string): SelectionState {
  const c = doc.components.find(x => x.id === componentId)
  const current = state[componentId]
  if (!c || !current || !canToggle(c)) return state
  return { ...state, [componentId]: { ...current, included: !current.included } }
}

export function swapOption(state: SelectionState, doc: LiveDocument, componentId: string, optionId: string): SelectionState {
  const c = doc.components.find(x => x.id === componentId)
  const current = state[componentId]
  const opt = c?.options.find(o => o.id === optionId)
  if (!c || !current || !opt || !opt.available) return state
  return { ...state, [componentId]: { ...current, optionId } }
}

/**
 * The exact `selection` body for the preview and request routes. Entries are sent only where they say
 * something the server would not assume: optional components always state `included`; a swapped option
 * sends `option_id`; required components never send `included`; excluded components send no option.
 */
export function toRequestSelection(doc: LiveDocument, state: SelectionState): SelectionInput {
  const components: SelectionInput['components'] = []
  for (const c of doc.components) {
    const choice = state[c.id]
    if (!choice) continue
    const entry: SelectionInput['components'][number] = { component_id: c.id }
    if (!isRequired(c)) entry.included = choice.included
    const serverDefault = c.options.find(o => o.is_default)?.id
    const include = isRequired(c) || choice.included
    if (include && choice.optionId && choice.optionId !== serverDefault) entry.option_id = choice.optionId
    if (entry.included !== undefined || entry.option_id !== undefined) components.push(entry)
  }
  return { components }
}

// ---- guest count ----

export function clampGuestCount(value: number, min: number | null, max: number | null): number {
  const lo = Math.max(GUEST_LIMITS.min, min ?? GUEST_LIMITS.min)
  const hi = Math.max(lo, Math.min(GUEST_LIMITS.max, max ?? GUEST_LIMITS.max))
  const n = Number.isFinite(value) ? Math.trunc(value) : lo
  return Math.min(Math.max(n, lo), hi)
}

/** The package minimum, or 10 when there is none (always within the package range). */
export function defaultGuestCount(min: number | null, max: number | null): number {
  return clampGuestCount(min ?? 10, min, max)
}

/** Digits only; anything else (including empty) falls back. */
export function parseGuestInput(text: string, fallback: number): number {
  const t = text.trim()
  return /^\d{1,6}$/.test(t) ? Number(t) : fallback
}

// ---- carrying a selection across a reload or a new version ----

export interface SavedChoice {
  componentId: string
  slotLabel: string
  optional: boolean
  included: boolean
  includedIsDefault: boolean
  optionId: string
  optionKey: string
  optionIsDefault: boolean
}

const optionKeyOf = (o: PublicOption) => `${norm(o.item?.name ?? '')}|${norm(o.provider?.name ?? '')}`

export function describeSelection(doc: LiveDocument, state: SelectionState): SavedChoice[] {
  return doc.components.flatMap((c): SavedChoice[] => {
    const choice = state[c.id]
    if (!choice) return []
    const base = initialChoice(c)
    const opt = c.options.find(o => o.id === choice.optionId)
    return [{
      componentId: c.id,
      slotLabel: c.slot_label,
      optional: !isRequired(c),
      included: choice.included,
      includedIsDefault: choice.included === base.included,
      optionId: choice.optionId,
      optionKey: opt ? optionKeyOf(opt) : '',
      optionIsDefault: choice.optionId === base.optionId,
    }]
  })
}

/**
 * Applies saved choices to a document. Component and option ids change between package versions, so
 * components match by id, then by slot label; options by id, then by item name + provider name.
 * `lost` counts non-default choices (swaps, toggles) that could not be carried over.
 */
export function restoreSelection(saved: readonly SavedChoice[], doc: LiveDocument): { state: SelectionState; lost: number } {
  const next: Record<string, ComponentChoice> = { ...initialSelection(doc) }
  let lost = 0
  for (const s of saved) {
    const c =
      doc.components.find(x => x.id === s.componentId) ??
      doc.components.find(x => norm(x.slot_label) === norm(s.slotLabel))
    if (!c) {
      if (!s.includedIsDefault || !s.optionIsDefault) lost += 1
      continue
    }
    const base = next[c.id]
    const opt =
      c.options.find(o => o.id === s.optionId) ??
      (s.optionKey ? c.options.find(o => optionKeyOf(o) === s.optionKey) : undefined)
    let optionId = base.optionId
    if (opt?.available) optionId = opt.id
    else if (!s.optionIsDefault) lost += 1

    let included = base.included
    if (canToggle(c) && s.optional) included = s.included
    else if (!s.includedIsDefault) lost += 1
    next[c.id] = { included, optionId }
  }
  return { state: next, lost }
}

export function reconcileSelection(prevDoc: LiveDocument, prevState: SelectionState, newDoc: LiveDocument) {
  return restoreSelection(describeSelection(prevDoc, prevState), newDoc)
}

export function isSavedChoiceArray(v: unknown): v is SavedChoice[] {
  return (
    Array.isArray(v) &&
    v.length <= 60 &&
    v.every(
      x =>
        typeof x === 'object' && x !== null &&
        typeof (x as SavedChoice).componentId === 'string' &&
        typeof (x as SavedChoice).slotLabel === 'string' &&
        typeof (x as SavedChoice).optional === 'boolean' &&
        typeof (x as SavedChoice).included === 'boolean' &&
        typeof (x as SavedChoice).includedIsDefault === 'boolean' &&
        typeof (x as SavedChoice).optionId === 'string' &&
        typeof (x as SavedChoice).optionKey === 'string' &&
        typeof (x as SavedChoice).optionIsDefault === 'boolean'
    )
  )
}

// ---- read-only summary for the request sheet ----

export interface SummaryLine {
  componentId: string
  slotLabel: string
  quantity: number
  name: string
  swapped: boolean
  addOn: boolean
}

export function summarizeSelection(doc: LiveDocument, state: SelectionState): SummaryLine[] {
  return doc.components.flatMap((c): SummaryLine[] => {
    const choice = state[c.id]
    if (!choice || !choice.included) return []
    const opt = c.options.find(o => o.id === choice.optionId)
    return [{
      componentId: c.id,
      slotLabel: c.slot_label,
      quantity: c.quantity,
      name: opt?.item?.name ?? 'To be assigned',
      swapped: !!opt && opt.id !== preselectedOption(c)?.id,
      addOn: !isRequired(c),
    }]
  })
}
