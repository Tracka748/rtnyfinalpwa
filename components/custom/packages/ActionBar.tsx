'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { primaryButtonClass } from './styles'

export interface BarAction {
  label: string
  sublabel?: string | null
  disabled: boolean
  onClick: () => void
}

interface Props {
  caption?: string | null
  text: string
  note?: string | null
  /** Numbers are being refreshed or are not available: show them muted (the text still says why). */
  dim?: boolean
  busy?: boolean
  action: BarAction
  onRetry?: () => void
  /** False slides the bar out and takes it out of the tab order. It stays mounted and fixed, so nothing shifts. */
  visible?: boolean
}

/** The slim sticky bar used in both modes. Fixed height, safe-area padding, 44px targets. */
export function ActionBar({ caption, text, note, dim, busy, action, onRetry, visible = true }: Props) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg',
        'transition-[transform,visibility] duration-200 motion-reduce:transition-none',
        visible ? 'visible translate-y-0' : 'invisible translate-y-full'
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-3xl items-center gap-3 px-4">
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true" aria-busy={busy}>
          {caption && <p className="font-label truncate text-[10px] tracking-widest text-text-secondary">{caption}</p>}
          <p
            className={cn(
              'truncate font-[family-name:var(--font-playfair)] text-base font-bold tabular-nums text-accent-primary sm:text-lg',
              dim && 'opacity-70'
            )}
          >
            {text}
          </p>
          {note && <p className="truncate text-xs text-text-primary/70">{note}</p>}
        </div>
        {onRetry && (
          <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onRetry}>
            Retry
          </Button>
        )}
        <div className="flex shrink-0 flex-col items-center">
          <Button type="button" className={primaryButtonClass} disabled={action.disabled} onClick={action.onClick}>
            {action.label}
          </Button>
          {action.sublabel && <span className="mt-0.5 text-[11px] leading-none text-text-primary/70">{action.sublabel}</span>}
        </div>
      </div>
    </div>
  )
}
