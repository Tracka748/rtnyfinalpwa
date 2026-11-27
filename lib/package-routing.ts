// Pure helpers for the package routing route (category and curator). No I/O, no Next imports.
// Only the messages below ever reach a client; Postgres text is never returned.

import { isUuid, type Validated } from '@/lib/catalog-validation'

export const ROUTING_FIELDS = ['category_id', 'curator_id'] as const

export interface RoutingPatch {
  category_id?: string | null
  curator_id?: string | null
}

export const CURATOR_NOT_ELIGIBLE = 'That person cannot be the curator. They need permission to manage requests.'
export const CATEGORY_INACTIVE = 'That category is not active.'
export const ROUTING_TARGET_MISSING = 'That category or person no longer exists.'
export const ROUTING_GENERIC = 'Something went wrong'

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

/**
 * Body: an object with category_id and/or curator_id. Each is a uuid, or null to clear it.
 * A key that is left out is not touched. An empty body or an unknown key is rejected.
 */
export function validateRoutingPatch(raw: unknown): Validated<RoutingPatch> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('Body must be a JSON object')
  const body = raw as Record<string, unknown>
  const extra = Object.keys(body).filter(k => !(ROUTING_FIELDS as readonly string[]).includes(k))
  if (extra.length > 0) return fail(`Unknown field(s): ${extra.slice(0, 5).map(k => k.slice(0, 40)).join(', ')}`)

  const value: RoutingPatch = {}
  for (const field of ROUTING_FIELDS) {
    if (!(field in body)) continue
    const v = body[field]
    if (v === null) { value[field] = null; continue }
    if (typeof v !== 'string' || !isUuid(v)) return fail(`${field} must be a valid id or null`)
    value[field] = v
  }
  if (Object.keys(value).length === 0) return fail('Provide category_id, curator_id, or both')
  return { ok: true, value }
}

/** Maps a database error to a status and a fixed message. Logs only a sanitised code. */
export function routingDbError(err: unknown, scope: string): { status: number; message: string } {
  const raw = (err as { code?: unknown } | null)?.code
  const code = typeof raw === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(raw) ? raw : 'unknown'
  console.error(`[package-routing] ${scope}: code=${code}`)
  if (code === '42501') return { status: 400, message: CURATOR_NOT_ELIGIBLE } // trigger: curator not eligible
  if (code === '22023') return { status: 400, message: CATEGORY_INACTIVE } // trigger: category inactive
  if (code === '23503') return { status: 400, message: ROUTING_TARGET_MISSING }
  return { status: 500, message: ROUTING_GENERIC }
}

// ---- GET response shaping (pure, so the route holds no logic of its own) ----

export const FALLBACK_NAME = 'Staff member'

export interface ProfileNameRow { id: string; first_name: string | null; last_name: string | null }
export interface CategoryRow { id: string; key: string; label: string; active: boolean }
export interface CoordinatorOption { id: string; name: string }
export interface CurrentCurator { id: string; name: string; eligible: boolean }
export interface CurrentCategory { id: string; key: string; label: string; active: boolean }

/** First and last name only, never an email. */
export function displayName(p: ProfileNameRow | undefined): string {
  return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || FALLBACK_NAME
}

/** Distinct coordinator ids from the RPC rows (column coordinator_id). */
export function coordinatorIds(rows: ReadonlyArray<{ coordinator_id: string }> | null | undefined): string[] {
  return [...new Set((rows ?? []).map(r => r.coordinator_id))]
}

/** Picker list: id and name, sorted by name then id. */
export function buildCoordinators(ids: readonly string[], profiles: readonly ProfileNameRow[]): CoordinatorOption[] {
  const byId = new Map(profiles.map(p => [p.id, p]))
  return ids
    .map(id => ({ id, name: displayName(byId.get(id)) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

/** The curator now on the package, with a name even if they are no longer eligible. */
export function buildCurrentCurator(
  curatorId: string | null, eligibleIds: readonly string[], profiles: readonly ProfileNameRow[]
): CurrentCurator | null {
  if (!curatorId) return null
  return {
    id: curatorId,
    name: displayName(profiles.find(p => p.id === curatorId)),
    eligible: eligibleIds.includes(curatorId),
  }
}

/** The category now on the package, even if it has been deactivated. Null if none or it is gone. */
export function buildCurrentCategory(row: CategoryRow | null | undefined): CurrentCategory | null {
  return row ? { id: row.id, key: row.key, label: row.label, active: row.active === true } : null
}

/** Ids whose names are needed: every eligible coordinator plus the current curator. */
export function profileIdsToLoad(eligibleIds: readonly string[], curatorId: string | null): string[] {
  return [...new Set([...eligibleIds, ...(curatorId ? [curatorId] : [])])]
}
