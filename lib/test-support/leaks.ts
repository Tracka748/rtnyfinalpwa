// Helper for "nothing internal reaches a response" tests. No vitest import.

export const FORBIDDEN_KEYS = [
  'created_by', 'updated_by', 'reviewed_by', 'review_note', 'partner_id', 'vendor_id', 'service_id',
  'catalog_item_id', 'link_id', 'link_status', 'status', 'revision', 'package_id', 'owner_id',
  'superseded_at', 'submitted_at', 'reviewed_at', 'captured_at', 'snapshot_version', 'package_version_id',
  'user_id', 'contact_email', 'coordinator_id', 'selected_package_id', 'vendor_snapshot', 'recipients', 'quotes',
] as const

function collectKeys(v: unknown, out: Set<string>) {
  if (Array.isArray(v)) { v.forEach(x => collectKeys(x, out)); return }
  if (typeof v === 'object' && v !== null) {
    for (const [k, val] of Object.entries(v)) { out.add(k); collectKeys(val, out) }
  }
}

/** Returns a description of every forbidden key or secret value found anywhere in `value`. */
export function findLeaks(value: unknown, opts: { secrets?: string[]; allowKeys?: string[] } = {}): string[] {
  const keys = new Set<string>()
  collectKeys(value, keys)
  const found: string[] = []
  for (const k of FORBIDDEN_KEYS) {
    if (keys.has(k) && !(opts.allowKeys ?? []).includes(k)) found.push(`key:${k}`)
  }
  const json = JSON.stringify(value)
  for (const s of opts.secrets ?? []) if (json.includes(s)) found.push(`value:${s}`)
  return found
}
