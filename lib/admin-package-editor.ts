// Pure logic for the admin draft editor. No React, no fetch, no Next imports.
//
// Two rules shape everything here:
// 1. A save request is ONLY ever { expected_revision, meta }. This module never mentions the
//    components list: leaving that key out keeps components untouched, while sending [] would delete them.
// 2. Fields are validated one at a time. An invalid field is "held" (left out of the request, its base
//    value unchanged, an error shown on it) and the other valid changes still save.

import { validateSaveDraft, type PackageMeta, type PricingTermsInput } from '@/lib/package-validation'
import { NETWORK_ERROR } from '@/lib/admin-package-ui'

// ---------------------------------------------------------------- form model

export const FIELD_KEYS = [
  'title', 'subtitle', 'description', 'price_note', 'cover_image_url', 'magazine_url',
  'min_guests', 'max_guests', 'pricing_terms',
] as const
export type FieldKey = (typeof FIELD_KEYS)[number]

export const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  price_note: 'Price note',
  cover_image_url: 'Cover image link',
  magazine_url: 'Magazine link',
  min_guests: 'Minimum guests',
  max_guests: 'Maximum guests',
  pricing_terms: 'Pricing',
}

export type PricingMode = 'none' | 'structured' | 'free_text'

export interface PricingForm {
  mode: PricingMode
  base_price: string
  included_guests: string
  extra_guest_price: string
  service_charge_pct: string
  service_charge_label: string
  deposit_amount: string
  balance_due_days: string
  free_text: string
  notes: string[]
}

export interface FormState {
  title: string
  subtitle: string
  description: string
  price_note: string
  cover_image_url: string
  magazine_url: string
  min_guests: string
  max_guests: string
  pricing: PricingForm
}

export const emptyPricing = (): PricingForm => ({
  mode: 'none', base_price: '', included_guests: '', extra_guest_price: '', service_charge_pct: '',
  service_charge_label: '', deposit_amount: '', balance_due_days: '', free_text: '', notes: [],
})

export function cloneForm(f: FormState): FormState {
  return { ...f, pricing: { ...f.pricing, notes: [...f.pricing.notes] } }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const numStr = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '')

function pricingFromStored(raw: unknown): PricingForm {
  const p = emptyPricing()
  if (!isObj(raw)) return p
  const notes = (Array.isArray(raw.notes) ? raw.notes : []).filter((n): n is string => typeof n === 'string')
  if (raw.mode === 'free_text') return { ...p, mode: 'free_text', free_text: str(raw.free_text), notes }
  if (raw.mode !== 'structured') return p
  return {
    ...p, mode: 'structured', notes,
    base_price: numStr(raw.base_price), included_guests: numStr(raw.included_guests),
    extra_guest_price: numStr(raw.extra_guest_price), service_charge_pct: numStr(raw.service_charge_pct),
    service_charge_label: str(raw.service_charge_label), deposit_amount: numStr(raw.deposit_amount),
    balance_due_days: numStr(raw.balance_due_days),
  }
}

/** The version object from GET .../versions/<id> -> the form. Anything unusable becomes an empty value. */
export function formFromVersion(version: unknown): FormState {
  const v = isObj(version) ? version : {}
  return {
    title: str(v.title), subtitle: str(v.subtitle), description: str(v.description), price_note: str(v.price_note),
    cover_image_url: str(v.cover_image_url), magazine_url: str(v.magazine_url),
    min_guests: numStr(v.min_guests), max_guests: numStr(v.max_guests),
    pricing: pricingFromStored(v.pricing_terms),
  }
}

// ---------------------------------------------------------------- pricing

type NumResult = { ok: true; v: number | undefined } | { ok: false; error: string }

function money(label: string, s: string, required: boolean): NumResult {
  const t = s.trim()
  if (!t) return required ? { ok: false, error: `${label} is required.` } : { ok: true, v: undefined }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false, error: `${label} must be a number with at most two decimal places.` }
  return { ok: true, v: Number(t) }
}

function whole(label: string, s: string, required: boolean): NumResult {
  const t = s.trim()
  if (!t) return required ? { ok: false, error: `${label} is required.` } : { ok: true, v: undefined }
  if (!/^\d+$/.test(t)) return { ok: false, error: `${label} must be a whole number.` }
  return { ok: true, v: Number(t) }
}

export type PricingResult = { ok: true; value: PricingTermsInput | null } | { ok: false; error: string }

/** Form -> pricing_terms for the save body. "none" clears the pricing (null). The server validator has the last word. */
export function pricingFromForm(f: PricingForm): PricingResult {
  if (f.mode === 'none') return { ok: true, value: null }
  const notes = f.notes.map(n => n.trim()).filter(Boolean)
  let candidate: Record<string, unknown>

  if (f.mode === 'free_text') {
    candidate = { mode: 'free_text', free_text: f.free_text, notes }
  } else {
    const base = money('Base price', f.base_price, true)
    if (!base.ok) return base
    const incl = whole('Included guests', f.included_guests, true)
    if (!incl.ok) return incl
    const dep = money('Deposit', f.deposit_amount, true)
    if (!dep.ok) return dep
    const extra = money('Extra guest price', f.extra_guest_price, false)
    if (!extra.ok) return extra
    const pct = money('Service charge percent', f.service_charge_pct, false)
    if (!pct.ok) return pct
    const days = whole('Balance due days', f.balance_due_days, false)
    if (!days.ok) return days
    candidate = { mode: 'structured', base_price: base.v, included_guests: incl.v, deposit_amount: dep.v, notes }
    if (extra.v !== undefined) candidate.extra_guest_price = extra.v
    if (pct.v !== undefined) candidate.service_charge_pct = pct.v
    if (days.v !== undefined) candidate.balance_due_days = days.v
    if (f.service_charge_label.trim()) candidate.service_charge_label = f.service_charge_label.trim()
  }

  const v = validateSaveDraft({ expected_revision: 1, meta: { pricing_terms: candidate } })
  if (!v.ok) return { ok: false, error: v.error }
  return { ok: true, value: v.value.meta?.pricing_terms ?? null }
}

const canonNum = (s: string): string => {
  const t = s.trim()
  return t !== '' && Number.isFinite(Number(t)) ? String(Number(t)) : t
}

/** A canonical string for the pricing block, so "10" and "10.00" or stray spaces are not a change. */
export function pricingKey(f: PricingForm): string {
  if (f.mode === 'none') return 'none'
  const notes = f.notes.map(n => n.trim()).filter(Boolean)
  if (f.mode === 'free_text') return JSON.stringify(['free_text', f.free_text.trim(), notes])
  return JSON.stringify([
    'structured', canonNum(f.base_price), canonNum(f.included_guests), canonNum(f.extra_guest_price),
    canonNum(f.service_charge_pct), f.service_charge_label.trim(), canonNum(f.deposit_amount),
    canonNum(f.balance_due_days), notes,
  ])
}

// ---------------------------------------------------------------- per-field access

/** The comparable value of one field: trimmed text, a canonical number, or the pricing key. */
function canon(f: FormState, k: FieldKey): string {
  switch (k) {
    case 'pricing_terms': return pricingKey(f.pricing)
    case 'min_guests': case 'max_guests': return canonNum(f[k])
    default: return f[k].trim()
  }
}

function copyField(target: FormState, source: FormState, k: FieldKey): void {
  if (k === 'pricing_terms') target.pricing = { ...source.pricing, notes: [...source.pricing.notes] }
  else target[k] = source[k]
}

/** Copies one field from source into a clone of target. Used to resolve a clash in favour of the server. */
export function pickField(target: FormState, source: FormState, k: FieldKey): FormState {
  const out = cloneForm(target)
  copyField(out, source, k)
  return out
}

// ---------------------------------------------------------------- diff and save body

export interface HeldField { field: FieldKey; label: string; message: string }
export interface DraftBody { expected_revision: number; meta: PackageMeta }

const held1 = (field: FieldKey, message: string): HeldField => ({ field, label: FIELD_LABELS[field], message })

type GuestParse = { ok: true; v: number | null } | { ok: false; error: string }

function parseGuests(label: string, s: string): GuestParse {
  const t = s.trim()
  if (!t) return { ok: true, v: null }
  if (!/^\d+$/.test(t)) return { ok: false, error: `${label} must be a whole number.` }
  return { ok: true, v: Number(t) }
}

/** The error the server validator gives for one field on its own, or null if it accepts it. */
function serverError(k: FieldKey, value: unknown): string | null {
  const v = validateSaveDraft({ expected_revision: 1, meta: { [k]: value } })
  return v.ok ? null : v.error
}

/**
 * Compares the loaded values (base) with the form, field by field. Valid changes go into meta; an invalid
 * change is held with a message and left out. Optional text that is cleared becomes null, never "".
 */
export function diffMeta(base: FormState, form: FormState): { meta: PackageMeta; held: HeldField[] } {
  const meta: Record<string, unknown> = {}
  const held: HeldField[] = []

  for (const k of FIELD_KEYS) {
    if (canon(base, k) === canon(form, k)) continue

    if (k === 'pricing_terms') {
      const p = pricingFromForm(form.pricing)
      if (p.ok) meta[k] = p.value
      else held.push(held1(k, p.error))
    } else if (k === 'min_guests' || k === 'max_guests') {
      const g = parseGuests(FIELD_LABELS[k], form[k])
      if (!g.ok) { held.push(held1(k, g.error)); continue }
      const err = serverError(k, g.v)
      if (err) held.push(held1(k, err))
      else meta[k] = g.v
    } else if (k === 'title') {
      const t = form.title.trim()
      if (!t) { held.push(held1(k, 'Title cannot be empty.')); continue }
      const err = serverError(k, t)
      if (err) held.push(held1(k, err))
      else meta[k] = t
    } else {
      const value = form[k].trim() || null
      const err = serverError(k, value)
      if (err) held.push(held1(k, err))
      else meta[k] = value
    }
  }

  // Minimum cannot be above maximum. Compare what would be saved: the new value, or the unchanged base.
  const eff = (k: 'min_guests' | 'max_guests'): number | null => {
    if (k in meta) return meta[k] as number | null
    const g = parseGuests(FIELD_LABELS[k], base[k])
    return g.ok ? g.v : null
  }
  const lo = eff('min_guests')
  const hi = eff('max_guests')
  if (lo !== null && hi !== null && lo > hi) {
    for (const k of ['min_guests', 'max_guests'] as const) {
      if (k in meta) { delete meta[k]; held.push(held1(k, 'Minimum guests cannot be more than maximum guests.')) }
    }
  }
  return { meta: meta as PackageMeta, held }
}

export type DraftPlan =
  | { kind: 'send'; body: DraftBody; held: HeldField[]; snapshot: FormState }
  | { kind: 'nochange'; held: HeldField[] }

/**
 * The only function that builds a save request. Valid changed fields go in the body; invalid ones come back in
 * `held`. `snapshot` is the exact form that was sent: after a successful save the base becomes this (see
 * advanceBase), never the live form, so edits made during the save stay unsaved.
 * Invariant: Object.keys(body) is exactly ['expected_revision', 'meta'].
 */
export function buildDraftBody(base: FormState, form: FormState, revision: number): DraftPlan {
  const { meta, held } = diffMeta(base, form)
  const keys = Object.keys(meta)
  if (keys.length === 0) return { kind: 'nochange', held }
  const body: DraftBody = { expected_revision: revision, meta }
  const v = validateSaveDraft(body)
  if (!v.ok) {
    // Should not happen after the per-field checks. If it does, hold everything that was about to be sent.
    const message = v.error
    return { kind: 'nochange', held: [...held, ...(keys as FieldKey[]).map(k => held1(k, message))] }
  }
  return { kind: 'send', body, held, snapshot: cloneForm(form) }
}

/** New base after a successful save: the snapshot that was sent, except held fields keep their old base value. */
export function advanceBase(base: FormState, snapshot: FormState, held: readonly HeldField[]): FormState {
  const next = cloneForm(snapshot)
  for (const h of held) copyField(next, base, h.field)
  return next
}

// ---------------------------------------------------------------- save state machine

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'

export interface EditorState {
  status: SaveStatus
  revision: number
  base: FormState
  form: FormState
  held: HeldField[]
  inFlight: { snapshot: FormState; held: HeldField[] } | null
  lastEditAt: number
  message: string | null
  everSaved: boolean
  theirs: { form: FormState; revision: number } | null
}

export type EditorEvent =
  | { type: 'edit'; form: FormState; now: number }
  | { type: 'saveStart' }
  | { type: 'saveOk'; revision: number }
  | { type: 'saveFail'; message: string }
  | { type: 'conflict'; theirs: { form: FormState; revision: number } }
  | { type: 'resolve'; merged: FormState }

export const AUTOSAVE_MS = 1500

export function initialEditorState(form: FormState, revision: number): EditorState {
  return {
    status: 'idle', revision, base: cloneForm(form), form: cloneForm(form), held: [], inFlight: null,
    lastEditAt: 0, message: null, everSaved: false, theirs: null,
  }
}

/** What would be sent right now. The page calls this, sends plan.body, and dispatches saveStart. */
export function planFromState(s: EditorState): DraftPlan {
  return buildDraftBody(s.base, s.form, s.revision)
}

// Recomputes held fields and the resting status (dirty if something valid is waiting to be saved).
function settle(s: EditorState): EditorState {
  const plan = planFromState(s)
  return {
    ...s, held: plan.held,
    status: plan.kind === 'send' ? 'dirty' : s.everSaved ? 'saved' : 'idle',
  }
}

export function saveReducer(s: EditorState, e: EditorEvent): EditorState {
  switch (e.type) {
    case 'edit': {
      const next = { ...s, form: e.form, lastEditAt: e.now }
      if (s.status === 'saving' || s.status === 'conflict') {
        return { ...next, held: planFromState(next).held }
      }
      return settle({ ...next, message: null })
    }
    case 'saveStart': {
      if (s.status === 'saving' || s.status === 'conflict') return s
      const plan = planFromState(s)
      if (plan.kind !== 'send') return settle(s)
      return { ...s, status: 'saving', held: plan.held, message: null, inFlight: { snapshot: plan.snapshot, held: plan.held } }
    }
    case 'saveOk': {
      if (!s.inFlight) return s
      const base = advanceBase(s.base, s.inFlight.snapshot, s.inFlight.held)
      // Settle against the CURRENT form: edits made during the save are still unsaved and send next.
      return settle({ ...s, base, revision: e.revision, inFlight: null, everSaved: true, message: null })
    }
    case 'saveFail':
      return { ...s, status: 'error', message: e.message, inFlight: null }
    case 'conflict':
      return { ...s, status: 'conflict', theirs: e.theirs, inFlight: null, message: null }
    case 'resolve': {
      if (!s.theirs) return s
      return settle({
        ...s, base: cloneForm(s.theirs.form), revision: s.theirs.revision, form: e.merged, theirs: null,
        inFlight: null, message: null,
      })
    }
  }
}

/** True once a valid pending change has been quiet for the debounce time. Never while saving or in conflict. */
export function shouldAutosave(s: EditorState, now: number, debounceMs: number = AUTOSAVE_MS): boolean {
  return s.status === 'dirty' && now - s.lastEditAt >= debounceMs
}

export function heldSummary(held: readonly HeldField[]): string {
  if (held.length === 0) return ''
  if (held.length === 1) return `1 field not saved: ${held[0].label}: ${held[0].message}`
  return `${held.length} fields not saved: ${held.map(h => h.label).join(', ')}`
}

/** The text for the aria-live save indicator. */
export function saveIndicatorText(s: EditorState): string {
  if (s.status === 'conflict') return 'This draft was changed somewhere else. Choose which version to keep.'
  if (s.status === 'saving') return 'Saving…'
  if (s.status === 'error') return s.message ?? 'Could not save.'
  const held = heldSummary(s.held)
  if (s.status === 'dirty') return held ? `Unsaved changes. ${held}` : 'Unsaved changes'
  if (held) return held
  return s.status === 'saved' ? 'All changes saved' : ''
}

/** Submit for review needs everything saved: no held field, no unsaved change, no save running, no conflict. */
export function canSubmit(s: EditorState): { ok: boolean; reason: string | null } {
  if (s.status === 'conflict') return { ok: false, reason: 'Resolve the conflict first.' }
  if (s.status === 'saving') return { ok: false, reason: 'Saving. Try again in a moment.' }
  if (s.held.length > 0) {
    return { ok: false, reason: `${s.held.length === 1 ? '1 field is' : `${s.held.length} fields are`} not saved. Fix ${s.held.length === 1 ? 'it' : 'them'} first.` }
  }
  if (s.status === 'dirty') return { ok: false, reason: 'There are unsaved changes. Wait for the save.' }
  if (s.status === 'error') return { ok: false, reason: 'The last save failed. Save again first.' }
  return { ok: true, reason: null }
}

// ---------------------------------------------------------------- conflict merge

/**
 * Three-way merge after a 409. base = what both sides started from, mine = my form, theirs = the server's now.
 * Changed only by me: keep mine. Changed only on the server: take theirs. Changed by both to different values:
 * a clash. The merged form keeps MY value for a clash (my work is never dropped silently); the admin can switch
 * a clash to the server's value with pickField.
 */
export function mergeConflict(
  base: FormState, mine: FormState, theirs: FormState
): { merged: FormState; clashes: FieldKey[] } {
  const merged = cloneForm(mine)
  const clashes: FieldKey[] = []
  for (const k of FIELD_KEYS) {
    const mineChanged = canon(base, k) !== canon(mine, k)
    const theirsChanged = canon(base, k) !== canon(theirs, k)
    if (!theirsChanged) continue
    if (!mineChanged) copyField(merged, theirs, k)
    else if (canon(mine, k) !== canon(theirs, k)) clashes.push(k)
  }
  return { merged, clashes }
}

// ---------------------------------------------------------------- error messages

export const SAVE_GENERIC = 'Something went wrong. Try again.'
export const SAVE_CONFLICT = 'This draft was changed somewhere else.'

/** status null means the request never reached the server. Only fixed text, or a short server message on 400. */
export function saveError(status: number | null, body: unknown): string {
  if (status === null) return NETWORK_ERROR
  if (status === 409) return SAVE_CONFLICT
  if (status === 401 || status === 403) return 'You do not have permission to edit this draft.'
  if (status === 404) return 'This draft no longer exists.'
  if (status === 400) {
    const msg = isObj(body) && typeof body.error === 'string' ? body.error.trim() : ''
    return msg && msg.length <= 200 ? msg : SAVE_GENERIC
  }
  return SAVE_GENERIC
}
