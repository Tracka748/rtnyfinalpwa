// Send-time checks for 'unclaimed_reminder' rows. The dedupe key names the unowned period it was
// enqueued for (reminder_24h:<unowned_since as integer epoch microseconds>); the request's current
// state decides whether that reminder is still true. Pure: no I/O.

export const REMINDER_KEY = /^reminder_24h:(\d{1,16})$/
const TERMINAL = new Set(['completed', 'declined', 'cancelled'])
const TS = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::?\d{2})?)$/

/**
 * Exact epoch microseconds for a PostgREST timestamptz string (e.g. 2026-11-20T10:11:12.123456+00:00).
 * Epoch microseconds stay below 2^53, so a number holds them exactly. Null when it does not parse.
 */
export function timestamptzToEpochMicros(v: string | null | undefined): number | null {
  const m = TS.exec((v ?? '').trim())
  if (!m) return null
  const [, y, mo, d, h, mi, s, frac = '', tz] = m
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59 || +s > 59) return null
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  if (!Number.isFinite(ms)) return null
  let offset = 0
  if (tz !== 'Z') {
    const sign = tz[0] === '-' ? -1 : 1
    const digits = tz.slice(1).replace(':', '')
    offset = sign * (Number(digits.slice(0, 2)) * 3600 + Number(digits.slice(2, 4) || '0') * 60)
  }
  return (ms / 1000 - offset) * 1_000_000 + Number(frac.padEnd(6, '0'))
}

/** The period start encoded in the key, or null when the key is malformed. */
export function parseReminderKey(key: string): number | null {
  const m = REMINDER_KEY.exec(key)
  if (!m) return null
  const n = Number(m[1])
  return Number.isSafeInteger(n) ? n : null
}

export type ReminderSkip = 'claimed_since' | 'closed_since' | 'new_unowned_period'
export type ReminderVerdict = { skip: ReminderSkip } | { fail: 'invalid_notification' } | null

/**
 * Whether this reminder is still true for the request as it is now. Null means send it.
 * Order matters: an owner wins over a closed status, which wins over a changed period.
 * A missing unowned_since means the period is over (skip); one that does not parse is a data
 * problem, not a state change (fail).
 */
export function reminderVerdict(
  req: { coordinator_id: string | null; status: string | null; unowned_since: string | null },
  keyMicros: number
): ReminderVerdict {
  if (req.coordinator_id) return { skip: 'claimed_since' }
  if (req.status && TERMINAL.has(req.status)) return { skip: 'closed_since' }
  if (req.unowned_since === null || req.unowned_since === undefined) return { skip: 'new_unowned_period' }
  const current = timestamptzToEpochMicros(req.unowned_since)
  if (current === null) return { fail: 'invalid_notification' }
  if (current !== keyMicros) return { skip: 'new_unowned_period' }
  return null
}
