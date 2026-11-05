// Keeps the selection and form across the sign-in round trip. sessionStorage only, always guarded.

import type { RequestFormValues } from '@/lib/package-request-form'
import { isSavedChoiceArray, type SavedChoice } from '@/lib/package-selection'
import type { StorageLike } from '@/lib/return-to'

export const RESUME_PREFIX = 'rtny:package-resume:'
export const RESUME_MAX_AGE_MS = 60 * 60 * 1000

export type ResumeMode = 'reserve' | 'quote'

export interface ResumePayload {
  v: 1
  mode: ResumeMode
  packageKey: string
  versionId: string
  guestCount: number
  selection: SavedChoice[]
  form: RequestFormValues
  savedAt: number
}

const isString = (v: unknown): v is string => typeof v === 'string'

function isForm(v: unknown): v is RequestFormValues {
  if (typeof v !== 'object' || v === null) return false
  const f = v as Record<string, unknown>
  return [f.eventDate, f.eventType, f.guestCount, f.budgetRange, f.notes].every(isString)
}

export function saveResume(storage: StorageLike | null, payload: ResumePayload): boolean {
  if (!storage) return false
  try {
    storage.setItem(RESUME_PREFIX + payload.packageKey, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearResume(storage: StorageLike | null, packageKey: string): void {
  try {
    storage?.removeItem(RESUME_PREFIX + packageKey)
  } catch {
    // ignore
  }
}

/** Returns the saved state for this package if it is intact and recent; otherwise null. */
export function loadResume(storage: StorageLike | null, packageKey: string, now: number = Date.now()): ResumePayload | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(RESUME_PREFIX + packageKey)
    if (!raw) return null
    const p: unknown = JSON.parse(raw)
    if (typeof p !== 'object' || p === null) return null
    const r = p as Partial<ResumePayload>
    if (r.v !== 1 || r.packageKey !== packageKey || !isString(r.versionId)) return null
    if (typeof r.guestCount !== 'number' || !Number.isFinite(r.guestCount)) return null
    if (typeof r.savedAt !== 'number' || now - r.savedAt > RESUME_MAX_AGE_MS || r.savedAt > now + 60_000) return null
    if (!isSavedChoiceArray(r.selection) || !isForm(r.form)) return null
    // Payloads saved before the reserve flow have no mode: they were quote requests.
    const rawMode = (p as { mode?: unknown }).mode
    const mode: unknown = rawMode === undefined ? 'quote' : rawMode
    if (mode !== 'reserve' && mode !== 'quote') return null
    return { ...(r as ResumePayload), mode }
  } catch {
    return null
  }
}
