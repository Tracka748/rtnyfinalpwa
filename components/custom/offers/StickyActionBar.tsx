'use client'

import { cn } from '@/lib/utils'

interface StickyActionBarProps {
  primaryLabel: string
  onPrimary: () => void
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  backLabel?: string
  onBack?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  // Extra positioning, e.g. 'md:left-64' to clear the admin sidebar.
  className?: string
  // 'stacked': full-width 56px primary on top, Back and the secondary action side by
  // side below (birthday perks step). Default keeps Back beside the primary.
  layout?: 'inline' | 'stacked'
}

// Fixed bottom action bar for multi-step flows. Pages using it need ~10rem of
// bottom padding so the last field isn't hidden behind it.
export function StickyActionBar({
  primaryLabel,
  onPrimary,
  disabled,
  loading,
  loadingLabel = 'Saving…',
  backLabel = 'Back',
  onBack,
  secondaryLabel,
  onSecondary,
  className,
  layout = 'inline',
}: StickyActionBarProps) {
  const busy = !!loading

  if (layout === 'stacked') {
    return (
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#121113]/95 backdrop-blur-sm',
          'px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]',
          className
        )}
      >
        <div className="max-w-2xl mx-auto space-y-2">
          <button
            type="button"
            onClick={onPrimary}
            disabled={disabled || busy}
            aria-busy={busy}
            className="w-full h-14 px-4 rounded-[14px] bg-[#59FFA0] text-black font-sans font-bold text-[17px] leading-tight hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {busy && <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
            {busy ? loadingLabel : primaryLabel}
          </button>
          {(onBack || (secondaryLabel && onSecondary)) && (
            <div className="flex gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={busy}
                  className="flex-1 min-h-12 px-4 rounded-xl border border-white/20 text-white/85 font-sans text-base font-medium hover:border-white/40 hover:text-white transition-colors disabled:opacity-50"
                >
                  {backLabel}
                </button>
              )}
              {secondaryLabel && onSecondary && (
                <button
                  type="button"
                  onClick={onSecondary}
                  disabled={busy}
                  className="flex-1 min-h-12 px-4 rounded-xl text-[#1AC8ED] font-sans text-base font-medium hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-50"
                >
                  {secondaryLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#121113]/95 backdrop-blur-sm',
        'px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
      <div className="max-w-2xl mx-auto space-y-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="min-h-12 px-4 shrink-0 rounded-xl border border-white/20 text-white/85 font-sans text-base font-medium hover:border-white/40 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onPrimary}
            disabled={disabled || busy}
            aria-busy={busy}
            className="flex-1 min-w-0 min-h-12 px-4 py-2 rounded-xl bg-[#59FFA0] text-[#121113] font-header font-bold text-lg leading-tight text-center hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {busy && (
              <span className="w-4 h-4 rounded-full border-2 border-[#121113]/30 border-t-[#121113] animate-spin" />
            )}
            {busy ? loadingLabel : primaryLabel}
          </button>
        </div>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={busy}
            className="w-full min-h-12 rounded-xl text-[#1AC8ED] font-sans text-base font-medium hover:bg-[#1AC8ED]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
