import { describe, expect, it } from 'vitest'
import {
  ERROR_LABELS, REQUEUE_MAX, THRESHOLDS, buildHealthView, errorLabel, formatAge, parseHealth, parseRequeueBody,
  parseRequeueResult, requeueSummary, type HealthRaw,
} from '@/lib/outbox-health'

const NOW = Date.parse('2026-11-20T12:00:00Z')
const iso = (secondsAgo: number) => new Date(NOW - secondsAgo * 1000).toISOString()
const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const ROW = { pending: 0, failed_7d: 0, skipped_7d: 0, sent_24h: 0 }

const raw = (over: Partial<HealthRaw> = {}): HealthRaw => ({
  pending: 0, pending_due: 0, sending: 0, sending_expired: 0,
  failed_24h: 0, failed_7d: 0, skipped_7d: 0, sent_24h: 0,
  oldest_due_pending_s: null, oldest_sending_s: null,
  last_sent_at: null, last_run_ok_at: iso(30), cron_readable: true,
  failed_by_error: {}, skipped_by_error: {}, by_kind: {},
  requeueable_ids: [], requeueable_count: 0, app_url_waiting: 0,
  generated_at: iso(0),
  ...over,
})
const mutated = (fn: (r: Record<string, unknown>) => void) => {
  const r = JSON.parse(JSON.stringify(raw())) as Record<string, unknown>
  fn(r)
  return r
}

describe('parseHealth', () => {
  it('accepts a complete payload, with null ages and times', () => {
    expect(parseHealth(raw())).toEqual(raw())
    const full = raw({
      pending: 3, oldest_due_pending_s: 42, oldest_sending_s: 7, last_sent_at: iso(5),
      failed_by_error: { provider_rejected: 2, none: 1 }, skipped_by_error: { not_eligible: 4 },
      by_kind: { new_request: { ...ROW, pending: 3 } }, requeueable_ids: [uuid(1), uuid(2)], requeueable_count: 2,
    })
    expect(parseHealth(full)).toEqual(full)
  })

  it('accepts a kind that contains a digit (and still rejects other shapes)', () => {
    const good = raw({ by_kind: { kind_2: { ...ROW, sent_24h: 1 }, reminder_24h: ROW } })
    expect(parseHealth(good)).toEqual(good)
    for (const kind of ['Kind', 'new-request', 'new request', '', 'a'.repeat(41)]) {
      expect(parseHealth(mutated(r => { r.by_kind = { [kind]: ROW } })), kind).toBeNull()
    }
    expect(parseHealth(raw({ by_kind: { ['a'.repeat(40)]: ROW } }))).not.toBeNull()
  })

  it.each([null, undefined, 'x', 5, []])('rejects a non-object (%s)', v => {
    expect(parseHealth(v)).toBeNull()
  })

  it.each([
    ['a missing count', (r: Record<string, unknown>) => { delete r.pending }],
    ['a negative count', (r: Record<string, unknown>) => { r.pending = -1 }],
    ['a decimal count', (r: Record<string, unknown>) => { r.failed_24h = 1.5 }],
    ['a numeric string', (r: Record<string, unknown>) => { r.sent_24h = '1' }],
    ['a bad age', (r: Record<string, unknown>) => { r.oldest_due_pending_s = -5 }],
    ['a missing age', (r: Record<string, unknown>) => { delete r.oldest_sending_s }],
    ['a bad timestamp', (r: Record<string, unknown>) => { r.last_run_ok_at = 'garbage' }],
    ['a missing generated_at', (r: Record<string, unknown>) => { delete r.generated_at }],
    ['a non-boolean cron_readable', (r: Record<string, unknown>) => { r.cron_readable = 'yes' }],
    ['an error code with a space', (r: Record<string, unknown>) => { r.failed_by_error = { 'Bad Code': 1 } }],
    ['an over-long error code', (r: Record<string, unknown>) => { r.skipped_by_error = { ['x'.repeat(49)]: 1 } }],
    ['a non-numeric error count', (r: Record<string, unknown>) => { r.failed_by_error = { provider_rejected: 'two' } }],
    ['a by_kind row missing a field', (r: Record<string, unknown>) => { r.by_kind = { new_request: { pending: 1, failed_7d: 0, skipped_7d: 0 } } }],
    ['a by_kind row with an extra field', (r: Record<string, unknown>) => { r.by_kind = { new_request: { ...ROW, extra: 1 } } }],
    ['a non-uuid id', (r: Record<string, unknown>) => { r.requeueable_ids = ['nope'] }],
    ['more than 100 ids', (r: Record<string, unknown>) => { r.requeueable_ids = Array.from({ length: 101 }, (_, i) => uuid(i)) }],
    ['ids that are not an array', (r: Record<string, unknown>) => { r.requeueable_ids = uuid(1) }],
  ])('rejects %s', (_name, fn) => {
    expect(parseHealth(mutated(fn))).toBeNull()
  })

  it('accepts exactly 100 ids', () => {
    expect(parseHealth(raw({ requeueable_ids: Array.from({ length: 100 }, (_, i) => uuid(i)) }))).not.toBeNull()
  })
})

describe('formatAge', () => {
  it.each([
    [0, '0 seconds'], [1, '1 second'], [59, '59 seconds'], [60, '1 minute'], [125, '2 minutes'],
    [3600, '60 minutes'], [7140, '119 minutes'], [7200, '2 hours'], [86400, '24 hours'],
  ])('%s s is %s', (s, text) => {
    expect(formatAge(s)).toBe(text)
  })
})

describe('buildHealthView: status and thresholds', () => {
  it('is healthy and empty when nothing is queued and the scheduler ran recently', () => {
    const v = buildHealthView(raw(), NOW)
    expect(v.status).toBe('healthy')
    expect(v.reasons).toEqual([])
    expect(v.notes).toEqual([])
    expect(v.isEmpty).toBe(true)
    expect(v.oldestDuePending).toBeNull()
  })

  it('is not empty once any count is above zero', () => {
    for (const k of ['pending', 'sending', 'sent_24h', 'failed_7d', 'skipped_7d'] as const) {
      expect(buildHealthView(raw({ [k]: 1 }), NOW).isEmpty, k).toBe(false)
    }
  })

  it('a due email: degraded above 180 s, stalled above 600 s', () => {
    expect(THRESHOLDS.degradedDuePendingS).toBe(180)
    expect(THRESHOLDS.stalledDuePendingS).toBe(600)
    expect(buildHealthView(raw({ oldest_due_pending_s: 180 }), NOW).status).toBe('healthy')
    expect(buildHealthView(raw({ oldest_due_pending_s: 181 }), NOW).status).toBe('degraded')
    expect(buildHealthView(raw({ oldest_due_pending_s: 600 }), NOW).status).toBe('degraded')
    const v = buildHealthView(raw({ oldest_due_pending_s: 601 }), NOW)
    expect(v.status).toBe('stalled')
    expect(v.reasons[0]).toBe('An email has been waiting 10 minutes to send.')
    expect(v.oldestDuePending).toBe('10 minutes')
  })

  it('the scheduler: stalled when the last successful run is over 600 s old, or missing', () => {
    expect(buildHealthView(raw({ last_run_ok_at: iso(600) }), NOW).status).toBe('healthy')
    const old = buildHealthView(raw({ last_run_ok_at: iso(601) }), NOW)
    expect(old.status).toBe('stalled')
    expect(old.reasons).toEqual(['The scheduler has not completed a run in 10 minutes.'])
    const none = buildHealthView(raw({ last_run_ok_at: null }), NOW)
    expect(none.status).toBe('stalled')
    expect(none.reasons).toEqual(['No successful scheduler run was found.'])
  })

  it('a run time in the future (clock skew) counts as just now', () => {
    expect(buildHealthView(raw({ last_run_ok_at: iso(-120) }), NOW).status).toBe('healthy')
  })

  it('unreadable scheduler history is a note, not a failure', () => {
    const v = buildHealthView(raw({ cron_readable: false, last_run_ok_at: null }), NOW)
    expect(v.status).toBe('healthy')
    expect(v.notes).toEqual(['Scheduler history is not readable, so only the queue is checked.'])
  })

  it('a send that has not finished: stalled above 1200 s', () => {
    expect(buildHealthView(raw({ oldest_sending_s: 1200 }), NOW).status).toBe('healthy')
    const v = buildHealthView(raw({ oldest_sending_s: 1201 }), NOW)
    expect(v.status).toBe('stalled')
    expect(v.reasons[0]).toBe('A send started 20 minutes ago has not finished.')
  })

  it('a failure in the last 24 hours is degraded, with singular and plural wording', () => {
    const one = buildHealthView(raw({ failed_24h: 1 }), NOW)
    expect(one.status).toBe('degraded')
    expect(one.reasons).toEqual(['1 email failed in the last 24 hours.'])
    expect(buildHealthView(raw({ failed_24h: 2 }), NOW).reasons).toEqual(['2 emails failed in the last 24 hours.'])
    // Older failures alone do not degrade the status.
    expect(buildHealthView(raw({ failed_7d: 9, failed_24h: 0 }), NOW).status).toBe('healthy')
  })

  it('emails waiting on the app URL setting are degraded', () => {
    const v = buildHealthView(raw({ app_url_waiting: 4 }), NOW)
    expect(v.status).toBe('degraded')
    expect(v.reasons[0]).toContain('NEXT_PUBLIC_APP_URL')
    expect(v.appUrlWaiting).toBe(4)
  })

  it('stalled wins over degraded and its reasons come first', () => {
    const v = buildHealthView(raw({ oldest_due_pending_s: 700, failed_24h: 1 }), NOW)
    expect(v.status).toBe('stalled')
    expect(v.reasons).toEqual(['An email has been waiting 11 minutes to send.', '1 email failed in the last 24 hours.'])
  })
})

describe('buildHealthView: groups and requeue data', () => {
  it('sorts failures by count then code, drops zero counts, and labels codes', () => {
    const v = buildHealthView(raw({
      failed_7d: 9,
      failed_by_error: { provider_rejected: 2, invalid_recipient: 2, app_url_not_configured: 5, gone_code: 0, weird_code: 1 },
    }), NOW)
    expect(v.failures.map(f => f.code)).toEqual(['app_url_not_configured', 'invalid_recipient', 'provider_rejected', 'weird_code'])
    expect(v.failures[0]).toEqual({ code: 'app_url_not_configured', label: 'App URL setting is missing', count: 5 })
    expect(v.failures[3].label).toBe('weird_code') // unknown codes show as they are
  })

  it('groups skips the same way', () => {
    const v = buildHealthView(raw({ skipped_by_error: { not_admin: 1, claimed_since: 3 } }), NOW)
    expect(v.skips.map(s => s.code)).toEqual(['claimed_since', 'not_admin'])
  })

  it('passes the requeue ids and counts through', () => {
    const v = buildHealthView(raw({ requeueable_ids: [uuid(1), uuid(2)], requeueable_count: 150 }), NOW)
    expect(v.requeueIds).toEqual([uuid(1), uuid(2)])
    expect(v.requeueCount).toBe(150)
  })

  it('has a label for every code the outbox can write today, and labels never come from the prototype', () => {
    for (const code of ['provider_rate_limited', 'provider_unavailable', 'provider_timeout', 'provider_auth', 'provider_rejected',
      'invalid_recipient', 'network_error', 'email_not_configured', 'app_url_not_configured', 'lease_expired',
      'lease_expired_max_attempts', 'recipient_lookup_failed', 'request_lookup_failed', 'activity_lookup_failed',
      'unexpected_error', 'invalid_notification', 'request_not_found', 'render_error', 'kind_not_supported',
      'no_longer_owner', 'no_verified_email', 'not_eligible', 'not_admin', 'status_changed_since', 'claimed_since',
      'closed_since', 'new_unowned_period', 'none']) {
      expect(ERROR_LABELS[code], code).toBeTruthy()
    }
    expect(errorLabel('constructor')).toBe('constructor')
    expect(errorLabel('toString')).toBe('toString')
  })
})

describe('parseRequeueBody', () => {
  const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const many = (n: number) => Array.from({ length: n }, (_, i) => uuid(i + 1))

  it('lowercases and de-duplicates ids', () => {
    const r = parseRequeueBody({ mode: 'failed', ids: [A.toUpperCase(), A, uuid(1)] })
    expect(r).toEqual({ ok: true, value: { mode: 'failed', ids: [A, uuid(1)] } })
  })

  it('accepts up to 100 distinct ids and rejects 101', () => {
    expect(REQUEUE_MAX).toBe(100)
    expect(parseRequeueBody({ mode: 'failed', ids: many(100) }).ok).toBe(true)
    const over = parseRequeueBody({ mode: 'failed', ids: many(101) })
    expect(over).toEqual({ ok: false, error: 'At most 100 ids per request' })
  })

  it('counts distinct ids, so 150 entries that reduce to 100 are accepted', () => {
    const r = parseRequeueBody({ mode: 'failed', ids: [...many(100), ...many(50)] })
    expect(r.ok && r.value.mode === 'failed' && r.value.ids.length).toBe(100)
  })

  it.each([
    ['no ids', { mode: 'failed' }],
    ['ids that are not an array', { mode: 'failed', ids: A }],
    ['null ids', { mode: 'failed', ids: null }],
    ['an empty list', { mode: 'failed', ids: [] }],
    ['a non-string id', { mode: 'failed', ids: [1] }],
    ['a non-uuid id', { mode: 'failed', ids: ['x'] }],
    ['one bad id among good ones', { mode: 'failed', ids: [A, 'x'] }],
    ['an unknown mode', { mode: 'all', ids: [A] }],
    ['no mode', { ids: [A] }],
    ['ids with app_url', { mode: 'app_url', ids: [A] }],
  ])('rejects %s', (_name, body) => {
    expect(parseRequeueBody(body as Record<string, unknown>).ok).toBe(false)
  })

  it('accepts app_url mode with no ids', () => {
    expect(parseRequeueBody({ mode: 'app_url' })).toEqual({ ok: true, value: { mode: 'app_url' } })
  })
})

describe('parseRequeueResult and requeueSummary', () => {
  it('reads the counts and ignores everything else', () => {
    expect(parseRequeueResult({ requested: 3, requeued: 2, skipped: 1 })).toEqual({ requeued: 2, skipped: 1, remaining: null })
    expect(parseRequeueResult({ requeued: 2, skipped: 0, remaining: 5 })).toEqual({ requeued: 2, skipped: 0, remaining: 5 })
  })

  it.each([null, 'x', [], {}, { requeued: -1, skipped: 0 }, { requeued: '1', skipped: 0 }, { requeued: 1 },
    { requeued: 1, skipped: 0, remaining: -1 }, { requeued: 1, skipped: 0, remaining: 'x' }])('rejects %j', v => {
    expect(parseRequeueResult(v)).toBeNull()
  })

  it('words the summary', () => {
    expect(requeueSummary({ requeued: 2, skipped: 0, remaining: null })).toBe('Requeued 2.')
    expect(requeueSummary({ requeued: 2, skipped: 1, remaining: 0 })).toBe('Requeued 2. 1 skipped (already handled or the request is closed).')
    expect(requeueSummary({ requeued: 100, skipped: 0, remaining: 7 })).toBe('Requeued 100. 7 still waiting: run it again.')
  })
})
