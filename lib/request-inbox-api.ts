// Shared plumbing for the staff request inbox routes: query validation, the single RPC
// error mapper (never returns or logs Postgres text), and no-store response helpers.

import type { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/catalog-api'
import type { Validated } from '@/lib/catalog-validation'

export const INBOX_SCOPES = ['all', 'mine', 'unassigned'] as const
export const INBOX_STATUSES = [
  'pending', 'in_progress', 'date_confirmed', 'deposit_requested',
  'deposit_received', 'completed', 'declined', 'cancelled',
] as const
export type InboxScope = (typeof INBOX_SCOPES)[number]
export type InboxStatus = (typeof INBOX_STATUSES)[number]

const MAX_OFFSET = 100000
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error })

export function validateInboxListQuery(sp: URLSearchParams): Validated<{
  scope: InboxScope
  status: InboxStatus | null
  limit: number
  offset: number
}> {
  const scope = sp.get('scope') || 'all'
  if (!(INBOX_SCOPES as readonly string[]).includes(scope)) {
    return bad(`scope must be one of: ${INBOX_SCOPES.join(', ')}`)
  }
  const status = sp.get('status') || null
  if (status && !(INBOX_STATUSES as readonly string[]).includes(status)) {
    return bad(`status must be one of: ${INBOX_STATUSES.join(', ')}`)
  }
  let limit = 25
  const rawLimit = sp.get('limit')
  if (rawLimit) {
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100) {
      return bad('limit must be an integer from 1 to 100')
    }
    limit = Number(rawLimit)
  }
  let offset = 0
  const rawOffset = sp.get('offset')
  if (rawOffset) {
    if (!/^\d+$/.test(rawOffset) || Number(rawOffset) > MAX_OFFSET) {
      return bad(`offset must be an integer from 0 to ${MAX_OFFSET}`)
    }
    offset = Number(rawOffset)
  }
  return { ok: true, value: { scope: scope as InboxScope, status: status as InboxStatus | null, limit, offset } }
}

/** Error response that is never cached. */
export function failNoStore(status: number, message: string): NextResponse {
  const res = fail(status, message)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Success response for data that includes request details: never cached. */
export function okNoStore<T>(data: T): NextResponse {
  const res = ok(data)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Inbox RPC failure: 42501 -> 403, anything else -> generic 500. Logs the code only. */
export function inboxError(err: unknown, scope: string): NextResponse {
  const raw = (err as { code?: unknown } | null)?.code
  const code = typeof raw === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(raw) ? raw : 'unknown'
  console.error(`[request-inbox] ${scope}: code=${code}`)
  return code === '42501' ? failNoStore(403, 'Forbidden') : failNoStore(500, 'Something went wrong')
}
