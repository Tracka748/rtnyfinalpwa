// Pure helpers for the admin delivery-health card: validate request_notifications_health() output,
// turn it into a view model with a status and plain-language reasons, and validate requeue input.
// Counts, ages, error codes and row ids only. No I/O.

export type HealthStatus = 'healthy' | 'degraded' | 'stalled'

export interface HealthRaw {
  pending: number; pending_due: number; sending: number; sending_expired: number
  failed_24h: number; failed_7d: number; skipped_7d: number; sent_24h: number
  oldest_due_pending_s: number | null; oldest_sending_s: number | null
  last_sent_at: string | null; last_run_ok_at: string | null; cron_readable: boolean
  failed_by_error: Record<string, number>; skipped_by_error: Record<string, number>
  by_kind: Record<string, { pending: number; failed_7d: number; skipped_7d: number; sent_24h: number }>
  requeueable_ids: string[]; requeueable_count: number; app_url_waiting: number
  generated_at: string
}

/** Seconds. Due pending rows normally go out within a minute (every-minute run). */
export const THRESHOLDS = {
  stalledDuePendingS: 600,   // a due email waiting over 10 minutes
  stalledLastRunS: 600,      // no successful scheduler run in 10 minutes
  stalledSendingS: 1200,     // a send claimed over 20 minutes ago (lease 10 min + recovery every 5)
  degradedDuePendingS: 180,  // a due email waiting over 3 minutes
} as const

export const REQUEUE_MAX = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE = /^(?:[a-z0-9_]{1,48}|none)$/
const KIND = /^[a-z0-9_]{1,40}$/

export const ERROR_LABELS: Record<string, string> = {
  provider_rate_limited: 'Email provider rate limit',
  provider_unavailable: 'Email provider unavailable',
  provider_timeout: 'Email provider timed out',
  provider_auth: 'Email provider rejected the API key',
  provider_rejected: 'Email provider rejected the message',
  invalid_recipient: 'Invalid recipient address',
  network_error: 'Network error',
  email_not_configured: 'Email sending is not configured',
  app_url_not_configured: 'App URL setting is missing',
  lease_expired: 'A send did not finish',
  lease_expired_max_attempts: 'A send did not finish after 5 tries',
  recipient_lookup_failed: 'Could not look up the recipient',
  request_lookup_failed: 'Could not look up the request',
  activity_lookup_failed: 'Could not look up the request history',
  unexpected_error: 'Unexpected error',
  invalid_notification: 'Notification did not match the request',
  request_not_found: 'Request no longer exists',
  render_error: 'Email could not be built',
  kind_not_supported: 'Notification type not supported',
  no_longer_owner: 'Recipient no longer owns the request',
  no_verified_email: 'Recipient has no verified email',
  not_eligible: 'Recipient can no longer manage requests',
  not_admin: 'Recipient is no longer an admin',
  status_changed_since: 'Request status changed before sending',
  claimed_since: 'Request was claimed before sending',
  closed_since: 'Request was closed before sending',
  new_unowned_period: 'Request changed owner before sending',
  none: 'No error code',
}
export const errorLabel = (code: string) =>
  Object.prototype.hasOwnProperty.call(ERROR_LABELS, code) ? ERROR_LABELS[code] : code

const count = (v: unknown): number | null => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : null)
const ageOrNull = (v: unknown): number | null | undefined => (v === null ? null : count(v) ?? undefined)
const timeOrNull = (v: unknown): string | null | undefined =>
  v === null ? null : typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : undefined
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function countMap(v: unknown, key: RegExp): Record<string, number> | null {
  if (!isObj(v)) return null
  const out: Record<string, number> = {}
  for (const [k, n] of Object.entries(v)) {
    const c = count(n)
    if (!key.test(k) || c === null) return null
    out[k] = c
  }
  return out
}

/** Strict shape check. Null when anything is missing or unexpected (the route then answers 500). */
export function parseHealth(v: unknown): HealthRaw | null {
  if (!isObj(v)) return null
  const counts = ['pending', 'pending_due', 'sending', 'sending_expired', 'failed_24h', 'failed_7d',
    'skipped_7d', 'sent_24h', 'requeueable_count', 'app_url_waiting'] as const
  const out: Record<string, unknown> = {}
  for (const k of counts) { const c = count(v[k]); if (c === null) return null; out[k] = c }
  for (const k of ['oldest_due_pending_s', 'oldest_sending_s'] as const) {
    const a = ageOrNull(v[k]); if (a === undefined) return null; out[k] = a
  }
  for (const k of ['last_sent_at', 'last_run_ok_at'] as const) {
    const t = timeOrNull(v[k]); if (t === undefined) return null; out[k] = t
  }
  if (typeof v.cron_readable !== 'boolean') return null
  if (typeof v.generated_at !== 'string' || Number.isNaN(Date.parse(v.generated_at))) return null
  const failed = countMap(v.failed_by_error, CODE)
  const skipped = countMap(v.skipped_by_error, CODE)
  if (!failed || !skipped) return null
  if (!isObj(v.by_kind)) return null
  const byKind: HealthRaw['by_kind'] = {}
  for (const [k, row] of Object.entries(v.by_kind)) {
    const m = countMap(row, /^(pending|failed_7d|skipped_7d|sent_24h)$/)
    if (!KIND.test(k) || !m || Object.keys(m).length !== 4) return null
    byKind[k] = m as HealthRaw['by_kind'][string]
  }
  const ids = v.requeueable_ids
  if (!Array.isArray(ids) || ids.length > REQUEUE_MAX || !ids.every(i => typeof i === 'string' && UUID.test(i))) return null
  return {
    ...(out as Omit<HealthRaw, 'cron_readable' | 'generated_at' | 'failed_by_error' | 'skipped_by_error' | 'by_kind' | 'requeueable_ids'>),
    cron_readable: v.cron_readable, generated_at: v.generated_at,
    failed_by_error: failed, skipped_by_error: skipped, by_kind: byKind, requeueable_ids: ids as string[],
  }
}

/** "45 seconds", "12 minutes", "3 hours". */
export function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const m = Math.floor(seconds / 60)
  if (m < 120) return `${m} minute${m === 1 ? '' : 's'}`
  const h = Math.floor(m / 60)
  return `${h} hour${h === 1 ? '' : 's'}`
}

export interface HealthView {
  status: HealthStatus
  reasons: string[]
  notes: string[]
  counts: { pending: number; sending: number; sent24h: number; failed7d: number; skipped7d: number }
  oldestDuePending: string | null
  failures: Array<{ code: string; label: string; count: number }>
  skips: Array<{ code: string; label: string; count: number }>
  requeueIds: string[]
  requeueCount: number
  appUrlWaiting: number
  isEmpty: boolean
  generatedAt: string
}

const grouped = (m: Record<string, number>) =>
  Object.entries(m).filter(([, n]) => n > 0).map(([code, n]) => ({ code, label: errorLabel(code), count: n }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))

export function buildHealthView(raw: HealthRaw, nowMs: number): HealthView {
  const stalled: string[] = []
  const degraded: string[] = []
  const notes: string[] = []
  const due = raw.oldest_due_pending_s

  if (due !== null && due > THRESHOLDS.stalledDuePendingS) stalled.push(`An email has been waiting ${formatAge(due)} to send.`)
  else if (due !== null && due > THRESHOLDS.degradedDuePendingS) degraded.push(`An email has been waiting ${formatAge(due)} to send.`)

  if (raw.cron_readable) {
    if (raw.last_run_ok_at === null) stalled.push('No successful scheduler run was found.')
    else {
      const age = Math.max(0, Math.floor((nowMs - Date.parse(raw.last_run_ok_at)) / 1000))
      if (age > THRESHOLDS.stalledLastRunS) stalled.push(`The scheduler has not completed a run in ${formatAge(age)}.`)
    }
  } else {
    notes.push('Scheduler history is not readable, so only the queue is checked.')
  }

  if (raw.oldest_sending_s !== null && raw.oldest_sending_s > THRESHOLDS.stalledSendingS) {
    stalled.push(`A send started ${formatAge(raw.oldest_sending_s)} ago has not finished.`)
  }
  if (raw.failed_24h > 0) degraded.push(`${raw.failed_24h} email${raw.failed_24h === 1 ? '' : 's'} failed in the last 24 hours.`)
  if (raw.app_url_waiting > 0) degraded.push('Team emails are waiting for the app URL setting (NEXT_PUBLIC_APP_URL).')

  const status: HealthStatus = stalled.length ? 'stalled' : degraded.length ? 'degraded' : 'healthy'
  const counts = { pending: raw.pending, sending: raw.sending, sent24h: raw.sent_24h, failed7d: raw.failed_7d, skipped7d: raw.skipped_7d }
  return {
    status,
    reasons: [...stalled, ...degraded],
    notes,
    counts,
    oldestDuePending: due === null ? null : formatAge(due),
    failures: grouped(raw.failed_by_error),
    skips: grouped(raw.skipped_by_error),
    requeueIds: raw.requeueable_ids,
    requeueCount: raw.requeueable_count,
    appUrlWaiting: raw.app_url_waiting,
    isEmpty: Object.values(counts).every(n => n === 0),
    generatedAt: raw.generated_at,
  }
}

export type RequeueInput = { mode: 'failed'; ids: string[] } | { mode: 'app_url' }

/** Validates the requeue body: ids are uuids, lowercased, de-duplicated, 1..100. */
export function parseRequeueBody(body: Record<string, unknown>): { ok: true; value: RequeueInput } | { ok: false; error: string } {
  if (body.mode === 'app_url') {
    if (body.ids !== undefined) return { ok: false, error: 'ids are not allowed for this mode' }
    return { ok: true, value: { mode: 'app_url' } }
  }
  if (body.mode !== 'failed') return { ok: false, error: 'mode must be failed or app_url' }
  if (!Array.isArray(body.ids)) return { ok: false, error: 'ids must be an array' }
  if (!body.ids.every(i => typeof i === 'string' && UUID.test(i))) return { ok: false, error: 'ids must be uuids' }
  const ids = [...new Set((body.ids as string[]).map(i => i.toLowerCase()))]
  if (ids.length === 0) return { ok: false, error: 'ids must not be empty' }
  if (ids.length > REQUEUE_MAX) return { ok: false, error: `At most ${REQUEUE_MAX} ids per request` }
  return { ok: true, value: { mode: 'failed', ids } }
}

/** The RPC result, reduced to the counts the card shows. Null when unexpected. */
export function parseRequeueResult(v: unknown): { requeued: number; skipped: number; remaining: number | null } | null {
  if (!isObj(v)) return null
  const requeued = count(v.requeued), skipped = count(v.skipped)
  if (requeued === null || skipped === null) return null
  const remaining = v.remaining === undefined ? null : count(v.remaining)
  if (v.remaining !== undefined && remaining === null) return null
  return { requeued, skipped, remaining }
}

export function requeueSummary(r: { requeued: number; skipped: number; remaining: number | null }): string {
  const parts = [`Requeued ${r.requeued}.`]
  if (r.skipped > 0) parts.push(`${r.skipped} skipped (already handled or the request is closed).`)
  if (r.remaining) parts.push(`${r.remaining} still waiting: run it again.`)
  return parts.join(' ')
}
