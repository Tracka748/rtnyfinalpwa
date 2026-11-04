'use client'

import { Button } from '@/components/ui/button'
import { lastGood, type PreviewState } from '@/hooks/usePackagePreview'
import { formatUsd, quoteLineNote } from '@/lib/package-page-format'
import { cn } from '@/lib/utils'

interface Props {
  state: PreviewState
  requestable: boolean
  onRequest: () => void
  onRetry: () => void
}

export function PriceBar({ state, requestable, onRequest, onRetry }: Props) {
  const snapshot = lastGood(state)
  const failed = state.status === 'error' || state.status === 'not_found'
  const rejected = state.status === 'rejected'
  const loading = state.status === 'loading'
  const canRequest = requestable && state.status === 'ready'

  let main: string
  if (!requestable) main = 'Unavailable right now'
  else if (failed) main = 'Price unavailable right now'
  else if (rejected) main = 'This combination isn’t available'
  else if (snapshot?.listed_subtotal != null) main = formatUsd(snapshot.listed_subtotal)
  else main = '—'

  const note = !failed && !rejected && requestable ? quoteLineNote(snapshot?.unpriced_items) : null
  const rejectedMessage = state.status === 'rejected' ? state.message : ''

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex min-h-[76px] max-w-3xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true" aria-busy={loading}>
          <p className="font-label text-[10px] tracking-widest text-text-secondary">Listed subtotal</p>
          <p
            className={cn(
              'truncate font-[family-name:var(--font-playfair)] text-xl font-bold tabular-nums text-accent-primary transition-opacity',
              (loading || failed || rejected || !requestable) && 'opacity-60'
            )}
          >
            {main}
          </p>
          <p className="min-h-4 text-xs text-text-primary/70">{rejectedMessage || note || ' '}</p>
        </div>
        {(failed || rejected) && requestable && (
          <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button type="button" className="min-h-11 shrink-0 px-5 text-base font-semibold" disabled={!canRequest} onClick={onRequest}>
          Request a quote
        </Button>
      </div>
    </div>
  )
}
