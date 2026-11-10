// Shared plumbing for the staff request lifecycle routes (claim, release, reassign, status, notes,
// assignable owners). The actor is ALWAYS the session user: the lifecycle functions trust whatever
// p_actor they are given, so a route must never take an actor, owner or operation from the client.

import type { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { isUuid, type Validated } from '@/lib/catalog-validation'
import { failNoStore } from '@/lib/request-inbox-api'
import { scheduleOutbox } from '@/lib/notifications/outbox'

// The limits live in a pure module so the browser UI can share them; re-exported here unchanged.
import { REASON_MAX, NOTE_MAX, countChars } from '@/lib/request-limits'
export { REASON_MAX, NOTE_MAX }

/** Statuses a staff member may move a request to. 'pending' is only reachable by releasing. */
export const STATUS_TARGETS = [
  'in_progress', 'date_confirmed', 'deposit_requested', 'deposit_received',
  'completed', 'declined', 'cancelled',
] as const
export type StatusTarget = (typeof STATUS_TARGETS)[number]

// ---- errors ----

// Fixed responses per SQLSTATE the lifecycle functions raise on purpose.
const CODE_RESPONSES: Record<string, { status: number; message: string }> = {
  RQ404: { status: 404, message: 'Request not found' },
  RQ409: { status: 409, message: "This request can't be changed that way right now" },
  RQ422: { status: 422, message: 'Invalid request' },
  '42501': { status: 403, message: 'Forbidden' },
}

// EXACT known SQL messages mapped to fixed client texts. The Postgres text itself is never returned
// or logged; anything not listed here falls back to the fixed message for its code.
const MESSAGE_RESPONSES: Record<string, string> = {
  'RQ409|request is closed': 'This request is closed',
  'RQ409|request already has an owner': 'This request already has an owner',
  'RQ409|request has no owner': 'This request has no owner',
  'RQ409|request must be claimed first': 'This request must be claimed first',
  'RQ422|new owner is not valid': 'The selected owner is not valid',
  'RQ422|assignee cannot manage requests': 'The selected person cannot manage requests',
}

/** Maps an RPC failure to a fixed response. Logs only the short code and the request id. */
export function lifecycleError(err: unknown, scope: string, requestId?: string): NextResponse {
  const e = (err ?? {}) as { code?: unknown; message?: unknown }
  const code = typeof e.code === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(e.code) ? e.code : 'unknown'
  const id = requestId && isUuid(requestId) ? ` id=${requestId}` : ''
  console.error(`[request-lifecycle] ${scope}: code=${code}${id}`)

  const base = CODE_RESPONSES[code]
  if (!base) return failNoStore(500, 'Something went wrong')
  const specific = typeof e.message === 'string' ? MESSAGE_RESPONSES[`${code}|${e.message}`] : undefined
  return failNoStore(base.status, specific ?? base.message)
}

// ---- admin check (assign / reassign / assignable owners) ----

/** Null when the session user is an admin; otherwise a 403. Fails closed on any error. */
export async function requireAdminActor(userId: string): Promise<NextResponse | null> {
  try {
    const { data, error } = await createSupabaseAdmin().rpc('tp_is_admin', { p_user_id: userId })
    if (error) {
      console.error('[request-lifecycle] admin check: code=' + (typeof error.code === 'string' ? error.code : 'unknown'))
      return failNoStore(403, 'Forbidden')
    }
    return data === true ? null : failNoStore(403, 'Forbidden')
  } catch {
    console.error('[request-lifecycle] admin check failed')
    return failNoStore(403, 'Forbidden')
  }
}

// ---- input ----

/** Reads a JSON object body (empty body = {}) and rejects any key that is not allowed. */
export async function readStrictBody(
  request: Request,
  allowed: readonly string[]
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  let raw: string
  try { raw = await request.text() } catch { return { ok: false, response: failNoStore(400, 'Request body must be valid JSON') } }
  let body: unknown = {}
  if (raw.trim() !== '') {
    try { body = JSON.parse(raw) } catch { return { ok: false, response: failNoStore(400, 'Request body must be valid JSON') } }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, response: failNoStore(400, 'Request body must be a JSON object') }
  }
  const extra = Object.keys(body).filter(k => !allowed.includes(k))
  if (extra.length > 0) return { ok: false, response: failNoStore(400, 'Request body has unknown fields') }
  return { ok: true, body: body as Record<string, unknown> }
}

/**
 * Trimmed text of 1..max characters (counted as code points, like Postgres). Optional text that is
 * missing or blank becomes null; required text that is missing or blank is an error.
 */
export function parseText(
  field: string,
  value: unknown,
  opts: { required: boolean; max: number }
): Validated<string | null> {
  if (value === undefined || value === null) {
    return opts.required ? { ok: false, error: `${field} is required` } : { ok: true, value: null }
  }
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` }
  const text = value.trim()
  if (text === '') return opts.required ? { ok: false, error: `${field} is required` } : { ok: true, value: null }
  if (countChars(text) > opts.max) return { ok: false, error: `${field} must be at most ${opts.max} characters` }
  return { ok: true, value: text }
}

export function parseUuid(field: string, value: unknown): Validated<string> {
  return isUuid(value) ? { ok: true, value: value.toLowerCase() } : { ok: false, error: `${field} must be a valid uuid` }
}

export function parseStatusTarget(value: unknown): Validated<StatusTarget> {
  return typeof value === 'string' && (STATUS_TARGETS as readonly string[]).includes(value)
    ? { ok: true, value: value as StatusTarget }
    : { ok: false, error: `to must be one of: ${STATUS_TARGETS.join(', ')}` }
}

// ---- output ----

/** Allowlist projection of a lifecycle RPC result: ids and status only, never free text. */
export function projectResult(data: unknown): { status?: string; owner_id?: string | null; activity_id?: string; action?: string } {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const out: { status?: string; owner_id?: string | null; activity_id?: string; action?: string } = {}
  if (typeof d.status === 'string') out.status = d.status
  if (typeof d.owner_id === 'string' || d.owner_id === null) out.owner_id = d.owner_id as string | null
  if (typeof d.activity_id === 'string') out.activity_id = d.activity_id
  if (typeof d.action === 'string') out.action = d.action
  return out
}

/** Queues the outbox run for a request. Never throws: a send problem must not fail the route. */
export function scheduleOutboxSafe(requestId: string): void {
  try {
    scheduleOutbox(requestId)
  } catch {
    console.error('[request-lifecycle] outbox schedule failed')
  }
}
