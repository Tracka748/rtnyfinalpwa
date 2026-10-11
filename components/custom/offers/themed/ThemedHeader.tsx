'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { CampaignTheme } from '../themes'
import { text } from '../styles'
import { Sprinkles } from './Sprinkles'

interface ThemedHeaderProps {
  theme: CampaignTheme
  // 'light': one 24px row under StepProgress (eyebrow + sprinkle strip).
  // 'full': eyebrow plus an optional real <h1>/<h2> title for welcome/success.
  variant: 'light' | 'full'
  // Hide the eyebrow when the page body already shows it (e.g. the perks step).
  showEyebrow?: boolean
  // Light variant: drop the sprinkle strip on screens that already carry two
  // decorations (the review step's framed preview).
  decorate?: boolean
  title?: ReactNode
  titleAs?: 'h1' | 'h2'
  seed?: number
  className?: string
}

export function ThemedHeader({
  theme,
  variant,
  showEyebrow = true,
  decorate = true,
  title,
  titleAs: Title = 'h1',
  seed = 7,
  className,
}: ThemedHeaderProps) {
  if (variant === 'light') {
    return (
      <div className={cn('flex h-6 items-center gap-3 overflow-hidden', className)}>
        {showEyebrow && (
          <p
            className="shrink-0 whitespace-nowrap font-label text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: theme.accent }}
          >
            {theme.eyebrow}
          </p>
        )}
        {/* The only decoration in the light header. */}
        {decorate && (
          <div className="relative h-6 min-w-0 flex-1">
            <Sprinkles palette={theme.sprinkles} area="header" seed={seed} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {showEyebrow && (
        <p className="font-label text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: theme.accent }}>
          {theme.eyebrow}
        </p>
      )}
      {title && <Title className={text.pageTitle}>{title}</Title>}
    </div>
  )
}
