// Error mapping for the admin alias routes. Only the messages below ever reach a client; Postgres
// text is never returned, and only the error code is logged.

import { failNoStore } from '@/lib/request-inbox-api'

export const ALIAS_TAKEN = 'That alias is already taken.'
export const ALIAS_RESERVED_MSG = 'That alias is reserved.'
export const ALIAS_FORMAT_MSG = 'Use only letters, numbers and underscores, 3 to 30 characters.'

export function aliasDbError(err: unknown, scope: string) {
  const e = (err ?? {}) as { code?: unknown; message?: unknown }
  const code = typeof e.code === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(e.code) ? e.code : 'unknown'
  console.error(`[alias] ${scope}: code=${code}`)
  if (code === '23505') return failNoStore(409, ALIAS_TAKEN)
  if (code === '23514') return failNoStore(400, ALIAS_FORMAT_MSG)
  // The reserved-word trigger raises P0001 with exactly this text; any other P0001 stays generic.
  if (code === 'P0001' && e.message === ALIAS_RESERVED_MSG) return failNoStore(400, ALIAS_RESERVED_MSG)
  if (code === '23503') return failNoStore(404, 'User not found')
  return failNoStore(500, 'Something went wrong')
}
