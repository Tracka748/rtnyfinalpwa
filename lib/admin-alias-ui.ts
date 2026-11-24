// Pure helpers for showing and editing @aliases on the admin users screen. No I/O, no React.

export interface AliasFields { alias?: string | null; is_special?: boolean }

/** Only users who already have an alias, or who are special and should have one, get an edit button. */
export function canEditAlias(u: AliasFields): boolean {
  return !!u.alias || u.is_special === true
}

/** A special user with no alias is the case an admin needs to notice (a failed hook, an old account). */
export function needsAliasFlag(u: AliasFields): boolean {
  return u.is_special === true && !u.alias
}

export const NETWORK_ERROR = 'Network error. Try again.'
export const GENERIC_SAVE_ERROR = 'Could not save the alias. Try again.'

/**
 * The message to show inline after a failed save. 400 and 409 carry the server's own alias message
 * (taken, reserved, format); every other status, and any odd body, gets a fixed message, so raw error
 * text from anywhere else never reaches the screen.
 */
export function aliasSaveError(status: number, body: unknown): string {
  if (status === 400 || status === 409) {
    const msg = (body as { error?: unknown } | null)?.error
    if (typeof msg === 'string' && msg.trim() !== '' && msg.length <= 200) return msg
    return GENERIC_SAVE_ERROR
  }
  if (status === 401 || status === 403) return 'You do not have permission to change aliases.'
  if (status === 404) return 'User not found.'
  return GENERIC_SAVE_ERROR
}

/** The alias from a successful PUT body, or null if the body is not the expected shape. */
export function parseSavedAlias(body: unknown): string | null {
  const b = body as { success?: unknown; data?: { alias?: unknown } } | null
  if (b?.success !== true) return null
  const a = b.data?.alias
  return typeof a === 'string' && a !== '' ? a : null
}

/** The alias and special flag from a GET .../alias body, or null if it is not the expected shape. */
export function parseAliasRefresh(body: unknown): { alias: string | null; is_special: boolean } | null {
  const b = body as { success?: unknown; data?: { alias?: unknown; is_special?: unknown } } | null
  if (b?.success !== true || !b.data) return null
  const { alias, is_special } = b.data
  if (!(alias === null || typeof alias === 'string')) return null
  if (typeof is_special !== 'boolean') return null
  return { alias, is_special }
}

/** A new list where only the matching row's alias fields change; other rows keep their identity. */
export function withAliasFields<T extends { id: string }>(users: readonly T[], id: string, patch: AliasFields): T[] {
  return users.map(u => (u.id === id ? { ...u, ...patch } : u))
}
