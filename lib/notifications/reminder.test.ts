import { describe, expect, it } from 'vitest'
import { parseReminderKey, reminderVerdict, timestamptzToEpochMicros } from '@/lib/notifications/reminder'

const UTC = '2026-11-20T10:11:12.123456+00:00'
const UTC_MICROS = Date.parse('2026-11-20T10:11:12Z') * 1000 + 123456

describe('timestamptzToEpochMicros', () => {
  it('is exact to the microsecond and matches the SQL key for the same instant', () => {
    expect(timestamptzToEpochMicros(UTC)).toBe(UTC_MICROS)
    // Same value the migration asserts: (extract(epoch from '2026-01-01 00:00:00.123456+00') * 1000000)::bigint
    expect(timestamptzToEpochMicros('2026-01-01 00:00:00.123456+00')).toBe(1767225600123456)
  })

  it('treats Z as +00:00 and handles other offsets', () => {
    expect(timestamptzToEpochMicros('2026-11-20T10:11:12.123456Z')).toBe(UTC_MICROS)
    expect(timestamptzToEpochMicros('2026-11-20T15:41:12.123456+05:30')).toBe(UTC_MICROS)
    expect(timestamptzToEpochMicros('2026-11-20T15:41:12.123456+0530')).toBe(UTC_MICROS)
    expect(timestamptzToEpochMicros('2026-11-20T06:11:12.123456-04:00')).toBe(UTC_MICROS)
    expect(timestamptzToEpochMicros('2026-11-20T06:11:12.123456-04')).toBe(UTC_MICROS)
  })

  it('pads short fractions and accepts none', () => {
    expect(timestamptzToEpochMicros('2026-11-20T10:11:12.5+00:00')).toBe(Date.parse('2026-11-20T10:11:12Z') * 1000 + 500000)
    expect(timestamptzToEpochMicros('2026-11-20T10:11:12+00:00')).toBe(Date.parse('2026-11-20T10:11:12Z') * 1000)
    expect(timestamptzToEpochMicros('2026-11-20 10:11:12.123456+00')).toBe(UTC_MICROS)
  })

  it('a 1 microsecond difference is visible', () => {
    expect(timestamptzToEpochMicros('2026-11-20T10:11:12.123457+00:00')).toBe(UTC_MICROS + 1)
  })

  it.each([null, undefined, '', 'garbage', '2026-11-20', '2026-11-20T10:11:12', '2026-13-01T00:00:00Z',
    '2026-11-20T10:11:12.1234567+00:00', '2026-11-20T25:00:00Z'])('returns null for %s', v => {
    expect(timestamptzToEpochMicros(v)).toBeNull()
  })
})

describe('parseReminderKey', () => {
  it('reads the microsecond period start', () => {
    expect(parseReminderKey(`reminder_24h:${UTC_MICROS}`)).toBe(UTC_MICROS)
  })

  it.each(['reminder_24h:', 'reminder_24h:abc', 'reminder_24h:-1', 'reminder_24h:12345678901234567',
    'reminder_48h:1', `assigned:11111111-1111-1111-1111-111111111111`, 'new_request', ` reminder_24h:1`])(
    'rejects %s', k => {
      expect(parseReminderKey(k)).toBeNull()
    })
})

describe('reminderVerdict', () => {
  const open = { coordinator_id: null, status: 'pending', unowned_since: UTC }

  it('sends when still unowned, open and in the same period', () => {
    expect(reminderVerdict(open, UTC_MICROS)).toBeNull()
    expect(reminderVerdict({ ...open, status: 'in_progress' }, UTC_MICROS)).toBeNull()
  })

  it('claimed_since when the request now has an owner (wins over closed and a changed period)', () => {
    expect(reminderVerdict({ ...open, coordinator_id: 'u-1', unowned_since: null }, UTC_MICROS)).toEqual({ skip: 'claimed_since' })
    expect(reminderVerdict({ coordinator_id: 'u-1', status: 'completed', unowned_since: null }, UTC_MICROS)).toEqual({ skip: 'claimed_since' })
  })

  it.each(['completed', 'declined', 'cancelled'])('closed_since when the status is %s (wins over a changed period)', s => {
    expect(reminderVerdict({ ...open, status: s }, UTC_MICROS)).toEqual({ skip: 'closed_since' })
    expect(reminderVerdict({ ...open, status: s }, UTC_MICROS + 1)).toEqual({ skip: 'closed_since' })
  })

  it('new_unowned_period when unowned_since no longer matches the key', () => {
    expect(reminderVerdict(open, UTC_MICROS + 1)).toEqual({ skip: 'new_unowned_period' })
    expect(reminderVerdict(open, UTC_MICROS - 1)).toEqual({ skip: 'new_unowned_period' })
  })

  it('new_unowned_period (skip) when unowned_since is null', () => {
    expect(reminderVerdict({ ...open, unowned_since: null }, UTC_MICROS)).toEqual({ skip: 'new_unowned_period' })
  })

  it('invalid_notification (fail) when unowned_since is set but does not parse', () => {
    expect(reminderVerdict({ ...open, unowned_since: 'not a time' }, UTC_MICROS)).toEqual({ fail: 'invalid_notification' })
  })
})
