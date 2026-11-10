import { describe, expect, it, vi } from 'vitest'

// The server module is imported only to prove the shared limits and status list stay in sync.
vi.mock('@/lib/supabase', () => ({ createSupabaseAdmin: vi.fn() }))
vi.mock('@/lib/notifications/outbox', () => ({ scheduleOutbox: vi.fn() }))

import { NOTE_MAX, REASON_MAX, STATUS_TARGETS as SERVER_TARGETS } from '@/lib/request-lifecycle-api'
import * as limits from '@/lib/request-limits'
import {
  EMAIL_NOTICE, REASON_LABEL, REDACTED_NOTICE, STAFF_FALLBACK, STATUS_TARGETS, TIMELINE_LIMIT,
  activityLabel, availableActions, checkNote, checkReason, confirmCopy, describeChange, hasAnyBarAction,
  isClosed, mayEmailCustomer, personName, reasonTag, reassignBody, releaseBody, requiresReason, safeMessage,
  showsReason, statusBody, timelineDetail, timelineTruncated,
  type ActionState,
} from './request-lifecycle-ui'

const base: ActionState = { status: 'in_progress', hasOwner: true, isOwner: false, isAdmin: false, canManage: true }
const actions = (over: Partial<ActionState>) => availableActions({ ...base, ...over })

describe('shared limits and status list', () => {
  it('match the server module', () => {
    expect(limits.REASON_MAX).toBe(REASON_MAX)
    expect(limits.NOTE_MAX).toBe(NOTE_MAX)
    expect([...STATUS_TARGETS]).toEqual([...SERVER_TARGETS])
    expect(REASON_MAX).toBe(500)
    expect(NOTE_MAX).toBe(2000)
  })
})

describe('availableActions', () => {
  it('an unowned open request: anyone who can manage may claim; only an admin may assign', () => {
    const open = { status: 'in_progress', hasOwner: false }
    expect(actions({ ...open })).toMatchObject({ claim: true, release: false, owner: null, reopen: false })
    expect(actions({ ...open, isAdmin: true })).toMatchObject({ claim: true, release: false, owner: 'assign' })
  })

  it('an owned open request: the owner may release; an admin may release and reassign; others get nothing', () => {
    expect(actions({ isOwner: true })).toMatchObject({ claim: false, release: true, owner: null })
    expect(actions({ isAdmin: true })).toMatchObject({ claim: false, release: true, owner: 'reassign' })
    const other = actions({})
    expect(other).toMatchObject({ claim: false, release: false, owner: null, statusOptions: [], note: false })
    expect(hasAnyBarAction(other)).toBe(false)
  })

  it('without the manage capability nothing is offered, even to an owner or admin flag', () => {
    const a = actions({ canManage: false, isOwner: true, isAdmin: true })
    expect(a).toMatchObject({ claim: false, release: false, owner: null, statusOptions: [], reopen: false, note: false })
  })

  it('an open owned request offers every status except the current one and pending', () => {
    for (const status of ['in_progress', 'date_confirmed', 'deposit_requested', 'deposit_received']) {
      const o = actions({ status, isOwner: true }).statusOptions
      expect(o).not.toContain(status)
      expect(o).not.toContain('pending')
      expect(o).toHaveLength(6)
    }
    expect(actions({ isAdmin: true, status: 'date_confirmed' }).statusOptions).toEqual(
      ['in_progress', 'deposit_requested', 'deposit_received', 'completed', 'declined', 'cancelled']
    )
  })

  it('a non-owner non-admin gets no status options', () => {
    expect(actions({ isOwner: false, isAdmin: false }).statusOptions).toEqual([])
  })

  it('an unowned pending request gives an admin declined and cancelled only, and a non-admin none', () => {
    const pending = { status: 'pending', hasOwner: false }
    expect(actions({ ...pending, isAdmin: true }).statusOptions).toEqual(['declined', 'cancelled'])
    expect(actions({ ...pending }).statusOptions).toEqual([])
    expect(actions({ ...pending, isOwner: true }).statusOptions).toEqual([])
    expect(actions({ ...pending }).claim).toBe(true) // a non-admin claims it first
  })

  it('a closed request offers only the admin reopen and the notes box', () => {
    for (const status of ['completed', 'declined', 'cancelled']) {
      expect(actions({ status, isAdmin: true })).toEqual({
        claim: false, release: false, owner: null, statusOptions: [], reopen: true, note: true,
      })
      expect(actions({ status, isOwner: true })).toEqual({
        claim: false, release: false, owner: null, statusOptions: [], reopen: false, note: true,
      })
      expect(actions({ status })).toMatchObject({ reopen: false, note: false })
    }
  })

  it('notes need manage plus admin or owner', () => {
    expect(actions({ isOwner: true }).note).toBe(true)
    expect(actions({ isAdmin: true }).note).toBe(true)
    expect(actions({}).note).toBe(false)
  })
})

describe('isClosed / mayEmailCustomer', () => {
  it('closes only completed, declined and cancelled', () => {
    for (const s of ['completed', 'declined', 'cancelled']) expect(isClosed(s)).toBe(true)
    for (const s of ['pending', 'in_progress', 'date_confirmed', 'deposit_requested', 'deposit_received', '', null, 5]) expect(isClosed(s)).toBe(false)
  })
  it('flags the four statuses that can email the customer', () => {
    for (const s of ['date_confirmed', 'deposit_requested', 'declined', 'cancelled']) expect(mayEmailCustomer(s)).toBe(true)
    for (const s of ['in_progress', 'deposit_received', 'completed', 'pending', null]) expect(mayEmailCustomer(s)).toBe(false)
  })
})

describe('reason rules and confirm copy', () => {
  it('requires a reason for release, reassign and reopen only; assign has an optional one', () => {
    expect(requiresReason('release')).toBe(true)
    expect(requiresReason('reassign')).toBe(true)
    expect(requiresReason('reopen')).toBe(true)
    for (const a of ['assign', 'claim', 'status', 'note'] as const) expect(requiresReason(a)).toBe(false)
  })

  it('shows a reason field on every action except claim and note; optional on status changes, required on reopen', () => {
    for (const a of ['release', 'assign', 'reassign', 'status', 'reopen'] as const) expect(showsReason(a)).toBe(true)
    for (const a of ['claim', 'note'] as const) expect(showsReason(a)).toBe(false)
    expect(reasonTag('status')).toBe('optional')
    expect(reasonTag('assign')).toBe('optional')
    for (const a of ['reopen', 'release', 'reassign'] as const) expect(reasonTag(a)).toBe('required')
  })

  it('labels every reason field with the same internal-only text', () => {
    expect(REASON_LABEL).toBe('Internal note, not sent to the customer')
  })

  it('a status change needs no reason, but a reopen does', () => {
    expect(checkReason('', requiresReason('status')).error).toBeNull()
    expect(checkReason('   ', requiresReason('status')).error).toBeNull()
    expect(checkReason('', requiresReason('reopen')).error).toBe('A reason is required')
    expect(checkReason('   ', requiresReason('reopen')).error).toBe('A reason is required')
  })

  it('request bodies never carry a blank reason', () => {
    expect(statusBody('declined', null)).toEqual({ to: 'declined' })
    expect('reason' in statusBody('declined', null)).toBe(false)
    expect(statusBody('declined', checkReason('   ', false).value)).toEqual({ to: 'declined' })
    expect(statusBody('declined', checkReason('  called them  ', false).value)).toEqual({ to: 'declined', reason: 'called them' })
    expect(statusBody('in_progress', 'reopening')).toEqual({ to: 'in_progress', reason: 'reopening' })
    expect(reassignBody('u1', null)).toEqual({ assignee_id: 'u1' })
    expect(reassignBody('u1', 'workload')).toEqual({ assignee_id: 'u1', reason: 'workload' })
    expect(releaseBody('busy')).toEqual({ reason: 'busy' })
  })

  it('an optional status reason allows 500 characters and rejects 501, counted by code points', () => {
    expect(checkReason('a'.repeat(500), false).error).toBeNull()
    expect(checkReason('a'.repeat(501), false).error).toMatch(/at most 500/)
    expect(checkReason('😀'.repeat(500), false).error).toBeNull()
    expect(checkReason('😀'.repeat(501), false).error).toMatch(/at most 500/)
    expect(statusBody('completed', checkReason('😀'.repeat(500), false).value).reason).toBe('😀'.repeat(500))
  })

  it('adds the email notice for the four customer-facing statuses only', () => {
    for (const to of ['date_confirmed', 'deposit_requested', 'declined', 'cancelled']) {
      expect(confirmCopy('status', to).lines).toContain(EMAIL_NOTICE)
    }
    for (const to of ['in_progress', 'deposit_received', 'completed']) {
      expect(confirmCopy('status', to).lines).not.toContain(EMAIL_NOTICE)
    }
    expect(EMAIL_NOTICE).toBe('The customer may be emailed about this change.')
    expect(confirmCopy('status', null).lines).not.toContain(EMAIL_NOTICE)
  })

  it('names the new status with its label, and never emails on other actions', () => {
    expect(confirmCopy('status', 'date_confirmed').title).toBe('Change status to Date confirmed?')
    for (const a of ['claim', 'release', 'assign', 'reassign', 'reopen', 'note'] as const) {
      expect(confirmCopy(a, 'cancelled').lines).not.toContain(EMAIL_NOTICE)
    }
  })
})

describe('checkReason / checkNote', () => {
  it('trims and counts code points', () => {
    expect(checkReason('  hello  ', true)).toEqual({ value: 'hello', count: 5, max: 500, error: null })
    expect(checkReason('😀'.repeat(500), true).error).toBeNull() // 500 characters, 1000 UTF-16 units
    expect(checkReason('😀'.repeat(501), true).error).toMatch(/at most 500/)
  })
  it('enforces the 500 and 2000 limits at the boundary', () => {
    expect(checkReason('a'.repeat(500), true).error).toBeNull()
    expect(checkReason('a'.repeat(501), false).error).toMatch(/500/)
    expect(checkNote('a'.repeat(2000)).error).toBeNull()
    expect(checkNote('a'.repeat(2001)).error).toMatch(/2000/)
  })
  it('a required reason or note cannot be blank or whitespace; an optional reason can', () => {
    for (const v of ['', '   ', '\n\t ']) {
      expect(checkReason(v, true).error).toBe('A reason is required')
      expect(checkNote(v).error).toBe('A note is required')
      expect(checkReason(v, false)).toEqual({ value: null, count: 0, max: 500, error: null })
    }
  })
  it('reports the live count of the trimmed text even when over the limit', () => {
    const c = checkReason('a'.repeat(520), true)
    expect(c.count).toBe(520)
    expect(c.value).toBe('a'.repeat(520))
    expect(c.error).not.toBeNull()
  })
})

describe('timeline helpers', () => {
  it('labels every action and falls back for unknown ones', () => {
    expect(['claimed', 'assigned', 'reassigned', 'released', 'unassigned', 'status_changed', 'reopened', 'note_added'].map(activityLabel)).toEqual([
      'Claimed', 'Assigned', 'Reassigned', 'Released', 'Unassigned', 'Status changed', 'Reopened', 'Note added',
    ])
    expect(activityLabel('constructor')).toBe('Updated')
    expect(activityLabel(null)).toBe('Updated')
  })

  it('uses a fixed fallback for unnamed people', () => {
    expect(personName('  Pat Lee ')).toBe('Pat Lee')
    for (const v of [null, undefined, '', '  ', 5]) expect(personName(v)).toBe(STAFF_FALLBACK)
    expect(STAFF_FALLBACK).toBe('Staff member')
  })

  it('describes status and owner changes in plain language', () => {
    expect(describeChange({ action: 'claimed', from_status: 'pending', to_status: 'in_progress', from_owner: null, to_owner: 'Pat' }))
      .toEqual(['Status: New → In progress', 'Owner: Pat'])
    expect(describeChange({ action: 'reassigned', from_status: 'in_progress', to_status: 'in_progress', from_owner: 'Pat', to_owner: null }))
      .toEqual(['Owner: Pat → Staff member'])
    expect(describeChange({ action: 'released', from_status: 'in_progress', to_status: 'pending', from_owner: 'Pat', to_owner: null }))
      .toEqual(['Status: In progress → New', 'Owner: Pat → Unassigned'])
    expect(describeChange({ action: 'unassigned', from_status: 'date_confirmed', to_status: 'date_confirmed', from_owner: null, to_owner: null }))
      .toEqual(['Owner: Staff member → Unassigned'])
    expect(describeChange({ action: 'status_changed', from_status: 'in_progress', to_status: 'declined', from_owner: null, to_owner: null }))
      .toEqual(['Status: In progress → Declined'])
    expect(describeChange({ action: 'note_added', from_status: null, to_status: null, from_owner: null, to_owner: null })).toEqual([])
  })

  describe('timelineDetail', () => {
    const entry = (action: string, reason: string | null, note: string | null) => ({ action, reason, note })

    it('shows the redaction notice only on redacted entries that can carry text, never for a claim', () => {
      for (const a of ['assigned', 'reassigned', 'released', 'unassigned', 'status_changed', 'reopened', 'note_added']) {
        expect(timelineDetail(entry(a, null, null), true)).toEqual({ kind: 'redacted' })
      }
      expect(timelineDetail(entry('claimed', null, null), true)).toEqual({ kind: 'none' })
      expect(timelineDetail(entry('mystery', null, null), true)).toEqual({ kind: 'none' })
      expect(REDACTED_NOTICE).toBe('Details visible to the owner and admins')
    })

    it('does not show the notice to a viewer who is not redacted, even when the text is null', () => {
      expect(timelineDetail(entry('claimed', null, null), false)).toEqual({ kind: 'none' })
      expect(timelineDetail(entry('assigned', null, null), false)).toEqual({ kind: 'none' })
      expect(timelineDetail(entry('note_added', '  ', ''), false)).toEqual({ kind: 'none' })
    })

    it('returns the reason and note text when present', () => {
      expect(timelineDetail(entry('released', 'busy week', null), false)).toEqual({ kind: 'text', reason: 'busy week', note: null })
      expect(timelineDetail(entry('note_added', null, 'line1\nline2'), false)).toEqual({ kind: 'text', reason: null, note: 'line1\nline2' })
    })
  })

  it('flags a timeline at the 200-entry cap', () => {
    expect(TIMELINE_LIMIT).toBe(200)
    expect(timelineTruncated(199)).toBe(false)
    expect(timelineTruncated(200)).toBe(true)
    expect(timelineTruncated(0)).toBe(false)
  })
})

describe('safeMessage', () => {
  it('keeps a short fixed string and drops everything else', () => {
    expect(safeMessage('  Forbidden ')).toBe('Forbidden')
    expect(safeMessage('a'.repeat(200))).toBe('a'.repeat(200))
    for (const v of ['a'.repeat(201), '', '   ', null, undefined, 5, {}, []]) expect(safeMessage(v)).toBeNull()
  })
})
