// The ONLY send/retry implementation for request notifications. It claims due rows with the
// request_notifications_claim_email RPC, builds and sends each email, then records the outcome with
// request_notifications_mark_email. It never throws and logs only row ids and short codes: no raw
// provider text, no addresses, no customer data.

import { after } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getEmailConfig, sendEmail, type EmailConfig } from '@/lib/notifications/email'
import {
  buildCustomerConfirmationEmail,
  buildCustomerStatusEmail,
  buildStaffAssignedEmail,
  buildStaffNewRequestEmail,
  isCustomerStatus,
  parseBaseUrl,
  type CustomerStatus,
  type EmailContent,
} from '@/lib/notifications/templates'

type Admin = ReturnType<typeof createSupabaseAdmin>
type Outcome = 'sent' | 'retry' | 'failed' | 'skipped'

interface OutboxRow { id: string; request_id: string; audience: string; recipient_user_id: string; kind: string; dedupe_key: string }
interface RequestInfo {
  request_source: string | null
  request_kind: string | null
  status: string | null
  user_id: string | null
  coordinator_id: string | null
}
interface Decision { outcome: Outcome; code?: string; providerId?: string | null }

export interface OutboxSummary { claimed: number; sent: number; retried: number; failed: number; skipped: number }

const DEFAULT_LIMIT = 20
const SCHEDULED_LIMIT = 50
const DEFAULT_PAUSE_MS = 550 // stays under Resend's default 2 requests/second

// Supported kinds and the audience each one must have. Anything else is skipped (kind_not_supported).
const KIND_AUDIENCE: Record<string, 'staff' | 'customer'> = {
  new_request: 'staff',
  assigned: 'staff',
  customer_confirmation: 'customer',
  status_update: 'customer',
}
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ASSIGNED_KEY = new RegExp(`^assigned:(${UUID})$`, 'i')
const STATUS_KEY = new RegExp(`^status:([a-z_]+):(${UUID})$`, 'i')
const STALE_SENSITIVE = new Set(['declined', 'cancelled']) // these must still match the request's current status

const skip = (code: string): Decision => ({ outcome: 'skipped', code })
const retry = (code: string): Decision => ({ outcome: 'retry', code })
const fail = (code: string): Decision => ({ outcome: 'failed', code })

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const logCode = (scope: string, err: unknown) =>
  console.error(`[notifications] ${scope}:`, (err as { code?: string } | null)?.code ?? 'unknown')

async function loadRequests(supabase: Admin, rows: OutboxRow[]): Promise<Map<string, RequestInfo> | null> {
  const ids = [...new Set(rows.map(r => r.request_id))]
  const { data, error } = await supabase
    .from('plan_requests')
    .select('id, request_source, request_kind, status, user_id, coordinator_id')
    .in('id', ids)
  if (error) { logCode('request lookup', error); return null }
  const map = new Map<string, RequestInfo>()
  for (const r of (data ?? []) as Array<{ id: string } & RequestInfo>) {
    map.set(r.id, {
      request_source: r.request_source,
      request_kind: r.request_kind,
      status: r.status ?? null,
      user_id: r.user_id ?? null,
      coordinator_id: r.coordinator_id ?? null,
    })
  }
  return map
}

/** The account's auth email, only when email_confirmed_at is set (a phone-only confirmation does not count). */
async function getConfirmedEmail(supabase: Admin, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error) throw error
  const user = data?.user
  return user?.email && user.email_confirmed_at ? user.email : null
}

/**
 * Loads the activity entry a lifecycle notification refers to and checks it against the row. The
 * row's dedupe key is only used to find the entry; what is trusted is the logged entry itself.
 */
async function checkActivity(
  supabase: Admin,
  row: OutboxRow
): Promise<{ decision: Decision } | { toStatus: CustomerStatus | null }> {
  const assigned = row.kind === 'assigned'
  const m = (assigned ? ASSIGNED_KEY : STATUS_KEY).exec(row.dedupe_key)
  if (!m) return { decision: fail('invalid_notification') }
  const activityId = assigned ? m[1] : m[2]
  const keyStatus = assigned ? null : m[1]
  if (!assigned && !isCustomerStatus(keyStatus)) return { decision: fail('invalid_notification') }

  let res: { data: unknown; error: unknown }
  try {
    res = await supabase
      .from('request_activity')
      .select('id, request_id, action, to_status, to_owner')
      .eq('id', activityId)
      .maybeSingle()
  } catch {
    return { decision: retry('activity_lookup_failed') }
  }
  if (res.error) { logCode('activity lookup', res.error); return { decision: retry('activity_lookup_failed') } }
  const a = res.data as { request_id: string; action: string; to_status: string | null; to_owner: string | null } | null
  if (!a || a.request_id !== row.request_id) return { decision: fail('invalid_notification') }

  if (assigned) {
    if ((a.action !== 'assigned' && a.action !== 'reassigned') || a.to_owner !== row.recipient_user_id) {
      return { decision: fail('invalid_notification') }
    }
    return { toStatus: null }
  }
  if (a.action !== 'status_changed' || a.to_status !== keyStatus) return { decision: fail('invalid_notification') }
  return { toStatus: keyStatus as CustomerStatus }
}

async function decide(
  supabase: Admin,
  row: OutboxRow,
  requests: Map<string, RequestInfo> | null,
  config: EmailConfig,
  baseUrl: string | null
): Promise<Decision> {
  const audience = Object.prototype.hasOwnProperty.call(KIND_AUDIENCE, row.kind) ? KIND_AUDIENCE[row.kind] : null
  if (!audience) return skip('kind_not_supported')
  if (row.audience !== audience) return fail('invalid_notification')
  if (!requests) return retry('request_lookup_failed')
  const req = requests.get(row.request_id)
  if (!req) return fail('request_not_found')
  const staff = audience === 'staff'

  let customerStatus: CustomerStatus | null = null
  if (row.kind === 'assigned') {
    const a = await checkActivity(supabase, row)
    if ('decision' in a) return a.decision
    // Only the current owner is ever notified; a later reassignment makes this row stale.
    if (req.coordinator_id !== row.recipient_user_id) return skip('no_longer_owner')
  } else if (row.kind === 'status_update') {
    // The recipient must be the request's own linked account; contact_email is never used.
    if (req.user_id !== row.recipient_user_id) return fail('invalid_notification')
    const a = await checkActivity(supabase, row)
    if ('decision' in a) return a.decision
    customerStatus = a.toStatus
    if (customerStatus && STALE_SENSITIVE.has(customerStatus) && req.status !== customerStatus) {
      return skip('status_changed_since')
    }
  }

  // Staff must still be eligible at send time (the DB only checked when the row was created).
  if (staff) {
    const { data, error } = await supabase.rpc('specialist_can', {
      p_user_id: row.recipient_user_id,
      p_capability: 'events.requests.manage',
      p_required: 'allow',
    })
    if (error) { logCode('eligibility check', error); return retry('recipient_lookup_failed') }
    if (data !== true) return skip('not_eligible')
  }

  let to: string | null
  try { to = await getConfirmedEmail(supabase, row.recipient_user_id) } catch { return retry('recipient_lookup_failed') }
  if (!to) return skip('no_verified_email')

  // Only emails that contain an application link need the base URL. Customer emails never read it.
  if (staff && !baseUrl) return retry('app_url_not_configured')

  let content: EmailContent
  try {
    if (row.kind === 'new_request') {
      content = buildStaffNewRequestEmail({ requestId: row.request_id, source: req.request_source, kind: req.request_kind, appUrl: baseUrl as string })
    } else if (row.kind === 'assigned') {
      content = buildStaffAssignedEmail({ requestId: row.request_id, appUrl: baseUrl as string })
    } else if (row.kind === 'status_update') {
      content = buildCustomerStatusEmail({ status: customerStatus as CustomerStatus })
    } else {
      content = buildCustomerConfirmationEmail({ source: req.request_source, kind: req.request_kind })
    }
  } catch {
    return fail('render_error')
  }

  try {
    const res = await sendEmail({ to, ...content }, config)
    if (res.ok) return { outcome: 'sent', providerId: res.id }
    return res.retryable ? retry(res.code) : fail(res.code)
  } catch {
    return retry('unexpected_error')
  }
}

async function mark(supabase: Admin, id: string, d: Decision): Promise<void> {
  const { data, error } = await supabase.rpc('request_notifications_mark_email', {
    p_id: id,
    p_outcome: d.outcome,
    p_error_code: d.code ?? null,
    p_provider_message_id: d.providerId ?? null,
  })
  if (error || data !== true) {
    // The row stays 'sending' and is re-claimed after its lease expires (at-least-once delivery).
    console.error('[notifications] mark failed:', id, (error as { code?: string } | null)?.code ?? 'not_updated')
  }
}

export async function processNotificationOutbox(
  opts: { requestId?: string; limit?: number; pauseMs?: number } = {}
): Promise<OutboxSummary> {
  const summary: OutboxSummary = { claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 }
  try {
    // Without a working email config nothing is claimed, so rows stay pending and send once it is fixed.
    const config = getEmailConfig()
    if (!config) {
      console.error('[notifications] outbox not run: email is not configured')
      return summary
    }
    // Validated once per run, used per row and only for emails that contain a link (see decide).
    const baseUrl = parseBaseUrl(process.env.NEXT_PUBLIC_APP_URL)

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase.rpc('request_notifications_claim_email', {
      p_limit: opts.limit ?? DEFAULT_LIMIT,
      p_request_id: opts.requestId,
    })
    if (error) { logCode('claim', error); return summary }

    const rows = (data ?? []) as OutboxRow[]
    summary.claimed = rows.length
    if (rows.length === 0) return summary

    const requests = await loadRequests(supabase, rows)
    const pauseMs = opts.pauseMs ?? DEFAULT_PAUSE_MS
    let urlMisconfigured = false

    for (const [i, row] of rows.entries()) {
      if (i > 0 && pauseMs > 0) await sleep(pauseMs)
      const d = await decide(supabase, row, requests, config, baseUrl)
      if (d.code === 'app_url_not_configured') urlMisconfigured = true
      await mark(supabase, row.id, d)
      if (d.outcome === 'sent') summary.sent++
      else if (d.outcome === 'retry') summary.retried++
      else if (d.outcome === 'failed') summary.failed++
      else summary.skipped++
    }
    if (urlMisconfigured) console.error('[notifications] team emails need a valid https NEXT_PUBLIC_APP_URL')
  } catch {
    console.error('[notifications] outbox run failed')
  }
  return summary
}

/** Sends this request's notifications after the response is returned. Never blocks or throws. */
export function scheduleOutbox(requestId: string): void {
  const run = () => processNotificationOutbox({ requestId, limit: SCHEDULED_LIMIT }).then(() => undefined)
  try { after(run) } catch { void run() }
}
