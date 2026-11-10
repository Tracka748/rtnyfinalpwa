'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import { Button } from '@/components/ui/button'
import { hasAnyBarAction, type AvailableActions, type LifecycleAction } from '@/lib/request-lifecycle-ui'

interface Props {
  actions: AvailableActions
  busy: boolean
  onAction: (action: Exclude<LifecycleAction, 'note'>) => void
}

const BTN = 'min-h-[44px] h-11 flex-1 basis-[8rem] px-4 text-sm font-semibold'

/**
 * Fixed action bar. It only shows controls: the server decides what is allowed.
 * Layering: z-30 sits below the admin drawer and its overlay (z-40/50), the site nav (z-55) and every
 * dialog (z-80). There is no fixed bottom nav in the admin area. From md the admin sidebar is a 16rem
 * column, so the bar starts at md:left-64 to stay clear of it. Pages need ~7rem of bottom padding.
 */
export function RequestActionBar({ actions, busy, onAction }: Props) {
  if (!hasAnyBarAction(actions)) return null
  return (
    <div
      role="region"
      aria-label="Request actions"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#121113]/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:left-64"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
        {actions.claim && (
          <Button type="button" disabled={busy} onClick={() => onAction('claim')} className={`${BTN} bg-[#59FFA0] text-black hover:bg-[#59FFA0]/90`}>
            Claim
          </Button>
        )}
        {actions.owner && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => onAction(actions.owner as 'assign' | 'reassign')} className={`${BTN} border-[#1AC8ED]/40 text-[#1AC8ED] bg-transparent hover:bg-[#1AC8ED]/10`}>
            {actions.owner === 'reassign' ? 'Reassign' : 'Assign'}
          </Button>
        )}
        {actions.statusOptions.length > 0 && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => onAction('status')} className={`${BTN} border-white/20 text-white bg-transparent hover:bg-white/10`}>
            Change status
          </Button>
        )}
        {actions.release && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => onAction('release')} className={`${BTN} border-white/20 text-white bg-transparent hover:bg-white/10`}>
            Release
          </Button>
        )}
        {actions.reopen && (
          <Button type="button" disabled={busy} onClick={() => onAction('reopen')} className={`${BTN} bg-[#59FFA0] text-black hover:bg-[#59FFA0]/90`}>
            Reopen
          </Button>
        )}
      </div>
    </div>
  )
}
