// Vendor ids a Plan My Event request carries (the vendors added with "Add to Plan").
// Pure helpers shared by the builder and the request route. Only ids travel: names, types and
// prices are never taken from the client; the server resolves names at read time.

export const MAX_RAW = 200
export const PLAN_VENDOR_LIMIT = 20

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const SERVICE_ID_LIMIT = 30

export type UuidListResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: 'malformed' | 'too_many' }
export type VendorIdsResult = UuidListResult

/**
 * undefined/null -> []. A non-array, more than MAX_RAW elements, or any element that is not a
 * uuid string -> 'malformed'. Ids are lowercased and deduplicated keeping first position; more than
 * `limit` distinct ids -> 'too_many' (never silently cut).
 */
export function parseUuidList(raw: unknown, limit: number): UuidListResult {
  if (raw === undefined || raw === null) return { ok: true, ids: [] }
  if (!Array.isArray(raw) || raw.length > MAX_RAW) return { ok: false, reason: 'malformed' }
  const ids: string[] = []
  const seen = new Set<string>()
  for (const v of raw) {
    if (typeof v !== 'string' || !UUID.test(v)) return { ok: false, reason: 'malformed' }
    const id = v.toLowerCase()
    if (!seen.has(id)) { seen.add(id); ids.push(id) }
  }
  if (ids.length > limit) return { ok: false, reason: 'too_many' }
  return { ok: true, ids }
}

/** Vendor ids from "Add to Plan": at most PLAN_VENDOR_LIMIT distinct. */
export const parseVendorIds = (raw: unknown): VendorIdsResult => parseUuidList(raw, PLAN_VENDOR_LIMIT)

/** Ticked service ids: at most SERVICE_ID_LIMIT distinct. */
export const parseServiceIds = (raw: unknown): UuidListResult => parseUuidList(raw, SERVICE_ID_LIMIT)

/** Keeps the ids that appear in rows (matched case-insensitively), in input order. */
export function keepKnown(ids: readonly string[], rows: ReadonlyArray<{ id?: unknown }> | null | undefined): string[] {
  const known = new Set(
    (rows ?? []).map(r => (typeof r?.id === 'string' ? r.id.toLowerCase() : null)).filter((x): x is string => x !== null),
  )
  return ids.filter(id => known.has(id.toLowerCase()))
}

/** The vendor ids the builder sends: one per added vendor, deduplicated, in the order added. */
export function planVendorIds(planItems: ReadonlyArray<{ vendorId: string }>): string[] {
  return [...new Set(planItems.map(p => p.vendorId))]
}

/** True when another vendor can still be added to the plan. */
export const canAddVendor = (count: number): boolean => count < PLAN_VENDOR_LIMIT

export const VENDOR_LIMIT_MESSAGE = `You can add up to ${PLAN_VENDOR_LIMIT} vendors.`

/** True when another service can still be ticked. */
export const canAddService = (count: number): boolean => count < SERVICE_ID_LIMIT

export const SERVICE_LIMIT_MESSAGE = `You can select up to ${SERVICE_ID_LIMIT} services.`
