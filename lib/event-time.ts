// Shared "which day is it / has it ended" helpers for event listings.
// All day boundaries are computed in EVENT_TIMEZONE via Intl, never with a
// fixed UTC offset, so they stay correct across DST changes.

export const EVENT_TIMEZONE = 'America/New_York'
export const EVENT_DEFAULT_DURATION_HOURS = 3

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zonedParts(ms: number) {
  const p: Record<string, number> = {}
  for (const part of partsFormatter.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  return p
}

// Offset (ms) of EVENT_TIMEZONE from UTC at the given instant (negative for New York).
function zoneOffsetMs(ms: number): number {
  const p = zonedParts(ms)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

export function isValidDateStr(dateStr: string): boolean {
  return DATE_RE.test(dateStr)
}

// Calendar date (YYYY-MM-DD) of the given instant in EVENT_TIMEZONE.
export function getEventDateStr(now: Date = new Date()): string {
  const p = zonedParts(now.getTime())
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

// UTC instant at which the given YYYY-MM-DD begins in EVENT_TIMEZONE.
export function startOfEventDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d)
  // Two passes so the offset is taken at the result, not the guess (DST edges).
  const first = guess - zoneOffsetMs(guess)
  return new Date(guess - zoneOffsetMs(first))
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// [start of dateStr, start of the next day) in EVENT_TIMEZONE, as UTC ISO strings.
export function getEventDayWindow(dateStr: string): { startIso: string; endIso: string } {
  return {
    startIso: startOfEventDay(dateStr).toISOString(),
    endIso: startOfEventDay(addDaysToDateStr(dateStr, 1)).toISOString(),
  }
}

// PostgREST .or() filter that keeps only events that have not ended yet:
// an explicit end in the future, or no end and a start within the default duration.
export function notEndedOrFilter(now: Date = new Date()): string {
  const nowIso = now.toISOString()
  const cutoffIso = new Date(
    now.getTime() - EVENT_DEFAULT_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString()
  return `event_end_date.gte.${nowIso},and(event_end_date.is.null,event_date.gte.${cutoffIso})`
}
