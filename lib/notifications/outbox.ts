// The ONLY send/retry implementation for request notifications. It claims due rows with the
// request_notifications_claim_email RPC, builds and sends each email, then records the outcome with
// request_notifications_mark_email. It never throws and logs only row ids and short codes: no raw
// provider text, no addresses, no customer data.

import { after } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getEmailConfig, sendEmail, type EmailConfig } from '@/lib/notifications/email'
import {
  buildCustomerConfirmationEmail,
  buildStaffNewRequestEmail,
  normalizeAppUrl,
  type EmailContent,
} from '@/lib/notifications/templates'

type Admin = ReturnType<typeof createSupabaseAdmin>
type Outcome = 'sent' | 'retry' | 'failed' | 'skipped'

interface OutboxRow { id: string; request_id: string; audience: string; recipient_user_id: string; kind: string }
interface RequestInfo { request_source: string | null; request_kind: string | null }
interface Decision { outcome: Outcome; code?: string; providerId?: string | null }

export interface OutboxSummary { claimed: number; sent: number; retried: number; failed: number; skipped: number }

const DEFAULT_LIMIT = 20
const SCHEDULED_LIMIT = 50
const DEFAULT_PAUSE_MS = 550 // stays under Resend's default 2 requests/second

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
    .select('id, request_source, request_kind')
    .in('id', ids)
  if (error) { logCode('request lookup', error); return null }
  const map = new Map<string, RequestInfo>()
  for (const r of (data ?? []) as Array<{ id: string } & RequestInfo>) {
    map.set(r.id, { request_source: r.request_source, request_kind: r.request_kind })
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

async function decide(
  supabase: Admin,
  row: OutboxRow,
  requests: Map<string, RequestInfo> | null,
  config: EmailConfig,
  appUrl: string
): Promise<Decision> {
  if (row.kind !== 'new_request' && row.kind !== 'customer_confirmation') return skip('kind_not_supported')
  const staff = row.kind === 'new_request'
  if ((staff && row.audience !== 'staff') || (!staff && row.audience !== 'customer')) return fail('invalid_notification')
  if (!requests) return retry('request_lookup_failed')
  const req = requests.get(row.request_id)
  if (!req) return fail('request_not_found')

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

  let content: EmailContent
  try {
    content = staff
      ? buildStaffNewRequestEmail({ requestId: row.request_id, source: req.request_source, kind: req.request_kind, appUrl })
      : buildCustomerConfirmationEmail({ source: req.request_source, kind: req.request_kind })
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
    // Without a working config nothing is claimed, so rows stay pending and send once it is fixed.
    const config = getEmailConfig()
    const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL)
    if (!config || !appUrl) {
      console.error('[notifications] outbox not run: email or app URL is not configured')
      return summary
    }

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

    for (const [i, row] of rows.entries()) {
      if (i > 0 && pauseMs > 0) await sleep(pauseMs)
      const d = await decide(supabase, row, requests, config, appUrl)
      await mark(supabase, row.id, d)
      if (d.outcome === 'sent') summary.sent++
      else if (d.outcome === 'retry') summary.retried++
      else if (d.outcome === 'failed') summary.failed++
      else summary.skipped++
    }
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
