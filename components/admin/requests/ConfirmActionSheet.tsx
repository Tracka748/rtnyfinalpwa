'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import { useEffect, useState } from 'react'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SheetDialogContent } from '@/components/custom/packages/SheetDialogContent'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { loadAssignableOwners, shouldCloseSheet, type AssignableOwner, type CallResult } from '@/lib/request-lifecycle-client'
import { REASON_MAX } from '@/lib/request-limits'
import {
  checkReason, confirmCopy, requiresReason, showsReason, type LifecycleAction, type StatusTarget,
} from '@/lib/request-lifecycle-ui'
import { statusLabel } from '@/lib/request-inbox-ui'

export type SheetAction = Exclude<LifecycleAction, 'note'>

export interface SheetSubmit {
  action: SheetAction
  reason: string | null
  assigneeId: string | null
  toStatus: StatusTarget | null
}

interface Props {
  /** The action being confirmed; null closes the sheet. */
  action: SheetAction | null
  statusOptions: StatusTarget[]
  /** The current owner's id, hidden from the assignee list (display only). */
  currentOwnerId: string | null
  busy: boolean
  onClose: () => void
  /** Runs the action. A 404/409 failure closes the sheet; any other failure keeps it open with the message. */
  onSubmit: (s: SheetSubmit) => Promise<CallResult>
}

const FIELD = 'min-h-[44px] w-full rounded-md border border-white/15 bg-[#121113] px-3 text-base text-white'

export function ConfirmActionSheet(props: Props) {
  // Remount per action so form state resets between actions but survives a failed submit.
  return (
    <Dialog open={props.action !== null} onOpenChange={o => { if (!o && !props.busy) props.onClose() }}>
      {props.action && <SheetBody key={props.action} {...props} action={props.action} />}
    </Dialog>
  )
}

function SheetBody({ action, statusOptions, currentOwnerId, busy, onClose, onSubmit }: Props & { action: SheetAction }) {
  const [reason, setReason] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [toStatus, setToStatus] = useState<StatusTarget | ''>(action === 'reopen' ? 'in_progress' : '')
  const [message, setMessage] = useState<string | null>(null)
  const [owners, setOwners] = useState<AssignableOwner[] | null>(null)
  const [ownersError, setOwnersError] = useState<string | null>(null)
  const kb = useKeyboardInset(true)

  const picksOwner = action === 'assign' || action === 'reassign'
  useEffect(() => {
    if (!picksOwner) return
    const ctrl = new AbortController()
    loadAssignableOwners(fetch, ctrl.signal).then(r => {
      if (ctrl.signal.aborted) return
      if (r.ok) setOwners(r.owners)
      else setOwnersError(r.message)
    })
    return () => ctrl.abort()
  }, [picksOwner])

  const reasonRequired = requiresReason(action)
  const reasonCheck = checkReason(reason, reasonRequired)
  const copy = confirmCopy(action, action === 'status' || action === 'reopen' ? toStatus || null : null)

  const visibleOwners = (owners ?? []).filter(o => o.id !== currentOwnerId)
  const missingChoice = (picksOwner && !assigneeId) || (action === 'status' && !toStatus)
  const canSubmit = !busy && !reasonCheck.error && !missingChoice

  async function submit() {
    if (!canSubmit) return
    setMessage(null)
    const result = await onSubmit({
      action,
      reason: showsReason(action) ? reasonCheck.value : null,
      assigneeId: picksOwner ? assigneeId : null,
      toStatus: action === 'status' || action === 'reopen' ? (toStatus || null) as StatusTarget | null : null,
    })
    if (result.ok) return // the page closes the sheet after it refreshes
    if (shouldCloseSheet(result.status)) return // the page closes the sheet and shows the message in its banner
    setMessage(result.message) // 422 / network / other: stay open and keep the form
  }

  return (
    <SheetDialogContent
      style={kb ? { bottom: kb.bottom, maxHeight: kb.maxHeight } : undefined}
      onInteractOutside={e => { if (busy) e.preventDefault() }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2 pt-5">
        <div className="pr-10">
          <DialogTitle className="font-header text-xl font-bold text-white">{copy.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-1 space-y-1 text-sm text-[#7DD8E8]">
              {copy.lines.map(l => <p key={l}>{l}</p>)}
            </div>
          </DialogDescription>
        </div>

        {action === 'status' && (
          <label className="block text-sm text-[#7DD8E8]">
            New status
            <select value={toStatus} onChange={e => setToStatus(e.target.value as StatusTarget | '')} disabled={busy} className={`${FIELD} mt-1`}>
              <option value="">Choose a status</option>
              {statusOptions.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </label>
        )}

        {picksOwner && (
          <label className="block text-sm text-[#7DD8E8]">
            {action === 'reassign' ? 'New owner' : 'Owner'}
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              disabled={busy || owners === null}
              className={`${FIELD} mt-1`}
            >
              <option value="">{owners === null && !ownersError ? 'Loading…' : 'Choose a person'}</option>
              {visibleOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {ownersError && <span role="alert" className="mt-1 block text-red-400">{ownersError}</span>}
          </label>
        )}

        {showsReason(action) && (
          <div>
            <label htmlFor="lifecycle-reason" className="block text-sm text-[#7DD8E8]">
              Reason {reasonRequired ? '(required)' : '(optional)'}
            </label>
            <Textarea
              id="lifecycle-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              onFocus={e => { const el = e.currentTarget; window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300) }}
              disabled={busy}
              rows={4}
              aria-invalid={reasonCheck.count > REASON_MAX}
              aria-describedby="lifecycle-reason-count"
              className="mt-1 min-h-[7rem] bg-[#121113] text-white"
            />
            <p id="lifecycle-reason-count" className={`mt-1 text-right text-xs ${reasonCheck.count > REASON_MAX ? 'text-red-400' : 'text-[#7DD8E8]'}`}>
              {reasonCheck.count}/{REASON_MAX}
            </p>
          </div>
        )}

        {message && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{message}</p>}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-white/10 bg-[#1a1819] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="min-h-[44px] h-11 flex-1 border-white/20 bg-transparent text-white hover:bg-white/10">
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={submit} aria-busy={busy} className="min-h-[44px] h-11 flex-1 bg-[#59FFA0] font-semibold text-black hover:bg-[#59FFA0]/90">
          {busy ? 'Working…' : copy.submitLabel}
        </Button>
      </div>
    </SheetDialogContent>
  )
}
