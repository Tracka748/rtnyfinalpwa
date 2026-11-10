// Pure UI rules for the request lifecycle actions. Everything here only decides what to SHOW: the
// server (the lifecycle routes and SQL functions) is the only authority, so nothing in this file is a
// security check.

import { NOTE_MAX, REASON_MAX, countChars } from '@/lib/request-limits'
import { statusLabel } from '@/lib/request-inbox-ui'

/** Statuses a staff member can move a request to ('pending' is only reached by releasing). */
export const STATUS_TARGETS = [
  'in_progress', 'date_confirmed', 'deposit_requested', 'deposit_received',
  'completed', 'declined', 'cancelled',
] as const
export type StatusTarget = (typeof STATUS_TARGETS)[number]

const CLOSED = new Set(['completed', 'declined', 'cancelled'])
export const isClosed = (status: unknown): boolean => typeof status === 'string' && CLOSED.has(status)

/** Statuses that may send the customer an email. */
const EMAILED = new Set<string>(['date_confirmed', 'deposit_requested', 'declined', 'cancelled'])
export const EMAIL_NOTICE = 'The customer may be emailed about this change.'
export const mayEmailCustomer = (status: unknown): boolean => typeof status === 'string' && EMAILED.has(status)

// ---- which actions to show ----

export type LifecycleAction = 'claim' | 'release' | 'assign' | 'reassign' | 'status' | 'reopen' | 'note'

export interface ActionState {
  status: string
  hasOwner: boolean
  isOwner: boolean
  isAdmin: boolean
  canManage: boolean
}

export interface AvailableActions {
  claim: boolean
  release: boolean
  owner: 'assign' | 'reassign' | null
  statusOptions: StatusTarget[]
  reopen: boolean
  note: boolean
}

export function availableActions(s: ActionState): AvailableActions {
  const admin = s.isAdmin && s.canManage
  const note = s.canManage && (s.isAdmin || s.isOwner)

  // A closed request can only be reopened (admin) or annotated.
  if (isClosed(s.status)) {
    return { claim: false, release: false, owner: null, statusOptions: [], reopen: admin, note }
  }

  // An unclaimed new request: the owner has to claim it first; an admin may still decline or cancel it.
  const statusOptions: StatusTarget[] =
    s.status === 'pending'
      ? admin ? ['declined', 'cancelled'] : []
      : s.canManage && (s.isAdmin || s.isOwner) ? STATUS_TARGETS.filter(t => t !== s.status) : []

  return {
    claim: s.canManage && !s.hasOwner,
    release: s.canManage && s.hasOwner && (s.isOwner || s.isAdmin),
    owner: admin ? (s.hasOwner ? 'reassign' : 'assign') : null,
    statusOptions,
    reopen: false,
    note,
  }
}

export const hasAnyBarAction = (a: AvailableActions): boolean =>
  a.claim || a.release || a.owner !== null || a.statusOptions.length > 0 || a.reopen

/** Reasons are required exactly where the SQL requires them: release, reassign (owned) and reopen. */
export function requiresReason(action: LifecycleAction): boolean {
  return action === 'release' || action === 'reassign' || action === 'reopen'
}

/** Whether the confirm sheet shows a reason field (optional for assign). */
export function showsReason(action: LifecycleAction): boolean {
  return requiresReason(action) || action === 'assign'
}

export interface ConfirmCopy { title: string; lines: string[]; submitLabel: string }

export function confirmCopy(action: LifecycleAction, toStatus?: string | null): ConfirmCopy {
  switch (action) {
    case 'claim':
      return { title: 'Claim this request?', lines: ['You will become its owner.'], submitLabel: 'Claim' }
    case 'release':
      return { title: 'Release this request?', lines: ['It goes back to the unassigned queue.'], submitLabel: 'Release' }
    case 'assign':
      return { title: 'Assign this request?', lines: ['The person you choose becomes its owner and is notified.'], submitLabel: 'Assign' }
    case 'reassign':
      return { title: 'Reassign this request?', lines: ['The person you choose becomes its new owner and is notified.'], submitLabel: 'Reassign' }
    case 'reopen':
      return { title: 'Reopen this request?', lines: ['It moves back to In progress.'], submitLabel: 'Reopen' }
    case 'note':
      return { title: 'Add this note?', lines: [], submitLabel: 'Add note' }
    case 'status': {
      const lines = toStatus ? [`Move this request to ${statusLabel(toStatus)}.`] : ['Choose the new status.']
      if (mayEmailCustomer(toStatus)) lines.push(EMAIL_NOTICE)
      return { title: toStatus ? `Change status to ${statusLabel(toStatus)}?` : 'Change status', lines, submitLabel: 'Change status' }
    }
  }
}

// ---- text validation (trimmed, counted by code points, like the routes) ----

export interface TextCheck {
  /** The trimmed text to send, or null when empty. */
  value: string | null
  count: number
  max: number
  error: string | null
}

function checkText(text: string, label: string, required: boolean, max: number): TextCheck {
  const value = text.trim()
  const count = countChars(value)
  if (value === '') return { value: null, count: 0, max, error: required ? `${label} is required` : null }
  if (count > max) return { value, count, max, error: `${label} must be at most ${max} characters` }
  return { value, count, max, error: null }
}

export const checkReason = (text: string, required: boolean): TextCheck => checkText(text, 'A reason', required, REASON_MAX)
export const checkNote = (text: string): TextCheck => checkText(text, 'A note', true, NOTE_MAX)

// ---- timeline ----

export const TIMELINE_LIMIT = 200
export const STAFF_FALLBACK = 'Staff member'
export const REDACTED_NOTICE = 'Details visible to the owner and admins'

export interface ActivityEntry {
  id: string
  created_at: string
  action: string
  actor: string | null
  from_status: string | null
  to_status: string | null
  from_owner: string | null
  to_owner: string | null
  reason: string | null
  note: string | null
}

const ACTIVITY_LABELS: Record<string, string> = {
  claimed: 'Claimed',
  assigned: 'Assigned',
  reassigned: 'Reassigned',
  released: 'Released',
  unassigned: 'Unassigned',
  status_changed: 'Status changed',
  reopened: 'Reopened',
  note_added: 'Note added',
}
export const activityLabel = (action: unknown): string =>
  typeof action === 'string' && Object.prototype.hasOwnProperty.call(ACTIVITY_LABELS, action) ? ACTIVITY_LABELS[action] : 'Updated'

/** A person's display name, or the fixed fallback when the server sent none. */
export const personName = (name: unknown): string =>
  typeof name === 'string' && name.trim() !== '' ? name.trim() : STAFF_FALLBACK

/** Plain-language change lines for one entry: the status move and the owner move. */
export function describeChange(e: Pick<ActivityEntry, 'action' | 'from_status' | 'to_status' | 'from_owner' | 'to_owner'>): string[] {
  const lines: string[] = []
  if (e.from_status && e.to_status && e.from_status !== e.to_status) {
    lines.push(`Status: ${statusLabel(e.from_status)} → ${statusLabel(e.to_status)}`)
  }
  switch (e.action) {
    case 'claimed':
    case 'assigned':
      lines.push(`Owner: ${personName(e.to_owner)}`)
      break
    case 'reassigned':
      lines.push(`Owner: ${personName(e.from_owner)} → ${personName(e.to_owner)}`)
      break
    case 'released':
    case 'unassigned':
      lines.push(`Owner: ${personName(e.from_owner)} → Unassigned`)
      break
  }
  return lines
}

// Actions that can carry a reason or note. A redacted viewer cannot tell whether text exists, so the
// notice is shown only for these kinds, never for a plain claim.
const CAN_CARRY_TEXT = new Set(['assigned', 'reassigned', 'released', 'unassigned', 'status_changed', 'reopened', 'note_added'])

export type TimelineDetail =
  | { kind: 'none' }
  | { kind: 'redacted' }
  | { kind: 'text'; reason: string | null; note: string | null }

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

export function timelineDetail(e: Pick<ActivityEntry, 'action' | 'reason' | 'note'>, activityRedacted: boolean): TimelineDetail {
  if (activityRedacted) return CAN_CARRY_TEXT.has(e.action) ? { kind: 'redacted' } : { kind: 'none' }
  const reason = text(e.reason)
  const note = text(e.note)
  return reason || note ? { kind: 'text', reason, note } : { kind: 'none' }
}

/** True when the server returned its cap, so older entries may exist. */
export const timelineTruncated = (count: number): boolean => count >= TIMELINE_LIMIT

// ---- safe messages ----

/** A route's fixed message is shown only when it is a short string; anything else is not shown. */
export function safeMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v !== '' && v.length <= 200 ? v : null
}
