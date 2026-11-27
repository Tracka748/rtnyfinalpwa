// Pure helpers for the admin packages list. No I/O, no React.

export interface PackageRow {
  id: string
  key: string
  occasion: string
  status: 'active' | 'archived'
  theme_name: string | null
  live_version: { id: string; version_number: number; title: string } | null
  open_version: { id: string; status: string; revision: number; title: string } | null
  version_count: number
}

export interface ThemeOption { id: string; name: string }

export const KEY_WARNING =
  'The key is permanent. It becomes the page address (/packages/<key>), it can never be changed, and it can never be reused, even if the package is archived.'

export const EDIT_EXPLAINER =
  '"Start a new draft" copies the live version into a draft. It does not change the live page: customers keep seeing the live version until an admin approves the draft. Reservations and requests that were already made keep the snapshot they were made with.'

export const OPEN_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In review',
  needs_changes: 'Changes requested',
}

const GENERIC = 'Something went wrong. Try again.'
const NETWORK = 'Network error. Try again.'
export { NETWORK as NETWORK_ERROR }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** theme_package_create_draft copies the live version, so a draft can only start for an active, live package with no open draft. */
export function canStartDraft(p: PackageRow): boolean {
  return p.status === 'active' && p.live_version !== null && p.open_version === null
}

export const openLabel = (status: string): string => OPEN_LABEL[status] ?? 'Open'

export function liveLabel(p: PackageRow): string {
  return p.live_version ? `version ${p.live_version.version_number}${p.live_version.title ? `, ${p.live_version.title}` : ''}` : 'Not live yet'
}

function parseRow(raw: unknown): PackageRow | null {
  if (!isObject(raw)) return null
  const { id, key, occasion, status, theme_name, live_version, open_version, version_count } = raw
  if (typeof id !== 'string' || typeof key !== 'string' || typeof occasion !== 'string') return null
  if (status !== 'active' && status !== 'archived') return null
  let live: PackageRow['live_version'] = null
  if (isObject(live_version) && typeof live_version.id === 'string' && typeof live_version.version_number === 'number') {
    live = { id: live_version.id, version_number: live_version.version_number, title: typeof live_version.title === 'string' ? live_version.title : '' }
  }
  let open: PackageRow['open_version'] = null
  if (isObject(open_version) && typeof open_version.id === 'string' && typeof open_version.status === 'string') {
    open = {
      id: open_version.id,
      status: open_version.status,
      revision: typeof open_version.revision === 'number' ? open_version.revision : 0,
      title: typeof open_version.title === 'string' ? open_version.title : '',
    }
  }
  return {
    id, key, occasion, status,
    theme_name: typeof theme_name === 'string' ? theme_name : null,
    live_version: live,
    open_version: open,
    version_count: typeof version_count === 'number' ? version_count : 0,
  }
}

/** One page of GET /api/v1/admin/packages, or null if the body is not the expected shape. */
export function parsePackagePage(json: unknown): { rows: PackageRow[]; nextOffset: number | null } | null {
  if (!isObject(json) || json.success !== true || !isObject(json.data) || !Array.isArray(json.data.packages)) return null
  const rows: PackageRow[] = []
  for (const r of json.data.packages) {
    const row = parseRow(r)
    if (!row) return null
    rows.push(row)
  }
  const next = json.data.has_more === true && typeof json.data.next_offset === 'number' ? json.data.next_offset : null
  return { rows, nextOffset: next }
}

/** GET /api/v1/themes: active themes only, { id, name }. Anything unexpected becomes null. */
export function parseThemes(json: unknown): ThemeOption[] | null {
  if (!isObject(json) || json.success !== true || !Array.isArray(json.data)) return null
  const out: ThemeOption[] = []
  for (const t of json.data) {
    if (isObject(t) && typeof t.id === 'string' && typeof t.name === 'string') out.push({ id: t.id, name: t.name })
  }
  return out
}

function serverMessage(body: unknown): string | null {
  const msg = isObject(body) ? body.error : null
  return typeof msg === 'string' && msg.trim() !== '' && msg.length <= 200 ? msg : null
}

/** Message for a failed POST /api/v1/admin/packages. 400 shows the route's own message; nothing else is shown raw. */
export function createPackageError(status: number, body: unknown): string {
  if (status === 409) return 'That key is already used. Keys can never be reused, even by an archived package.'
  if (status === 400) return serverMessage(body) ?? GENERIC
  if (status === 401 || status === 403) return 'You do not have permission to create packages.'
  return GENERIC
}

/** Message for a failed POST /api/v1/admin/packages/{id}/versions. */
export function startDraftError(status: number, body: unknown): string {
  if (status === 409) return 'This package already has an open draft.'
  if (status === 400) return serverMessage(body) ?? GENERIC
  if (status === 401 || status === 403) return 'You do not have permission to start drafts.'
  if (status === 404) return 'Package not found.'
  return GENERIC
}
