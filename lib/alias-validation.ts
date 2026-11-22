// Pure alias rules for @alias. No I/O.
// The database is the real enforcement (format check, unique index, reserved-word trigger); this is
// the fast path that gives the admin a clear message before a round trip. Suggestions stay in the
// database function suggest_alias.

export const ALIAS_MIN = 3
export const ALIAS_MAX = 30
const ALIAS_RE = /^[a-z0-9_]+$/

// A copy of public.alias_reserved_words. A test reads every migration that inserts into that table
// and fails if this list drifts from it.
export const ALIAS_RESERVED_WORDS: readonly string[] = [
  'admin', 'administrator', 'rtny', 'rocticketny', 'support', 'help', 'staff', 'team', 'official', 'system',
  'root', 'moderator', 'mod', 'null', 'undefined', 'me', 'you', 'all', 'everyone', 'anonymous', 'deleted', 'api',
  'events', 'packages', 'partners', 'partner', 'groups', 'crews', 'dashboard', 'promoter', 'promoters',
  'organizer', 'organizers', 'login', 'logout', 'signup', 'auth', 'settings', 'profile', 'search', 'tickets',
  'orders', 'checkout', 'plan', 'requests', 'specialist', 'specialists', 'vendors', 'businesses', 'magazine',
]

/** trim, strip one leading "@", lowercase. Anything that is not a string becomes ''. */
export function normalizeAlias(input: unknown): string {
  if (typeof input !== 'string') return ''
  const t = input.trim()
  return (t.startsWith('@') ? t.slice(1) : t).toLowerCase()
}

export type AliasResult = { ok: true; alias: string } | { ok: false; error: string }

export function validateAlias(input: unknown): AliasResult {
  if (typeof input !== 'string') return { ok: false, error: 'Alias is required.' }
  const alias = normalizeAlias(input)
  if (alias === '') return { ok: false, error: 'Alias is required.' }
  if (!ALIAS_RE.test(alias)) return { ok: false, error: 'Use only letters, numbers and underscores.' }
  if (alias.length < ALIAS_MIN || alias.length > ALIAS_MAX) {
    return { ok: false, error: `Alias must be ${ALIAS_MIN} to ${ALIAS_MAX} characters.` }
  }
  if (ALIAS_RESERVED_WORDS.includes(alias)) return { ok: false, error: 'That alias is reserved.' }
  return { ok: true, alias }
}
