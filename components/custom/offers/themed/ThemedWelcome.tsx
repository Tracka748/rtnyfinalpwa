'use client'

import type { ReactNode } from 'react'
import type { CampaignTheme } from '../themes'
import { ThemedHeader } from './ThemedHeader'
import { ThemedImage } from './ThemedImage'
import { Sprinkles } from './Sprinkles'
import { BalloonsSvg } from './fallbacks'

interface ThemedWelcomeProps {
  theme: CampaignTheme
  // The existing welcome step content (copy and CTA behavior unchanged).
  children: ReactNode
}

const ART = 144

// Decorations (max 2): the welcome illustration and a sprinkle burst around it.
// The baby-blue glow is a background tint, not an element.
export function ThemedWelcome({ theme, children }: ThemedWelcomeProps) {
  return (
    <div className="space-y-6">
      <ThemedHeader theme={theme} variant="full" />

      {/* Reserved 176px box: art never shifts layout and never overlaps text. */}
      <div className="relative mx-auto h-44 w-44" aria-hidden="true">
        <div
          className="absolute inset-4 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${theme.accent2}40 0%, ${theme.accent2}00 70%)` }}
        />
        <Sprinkles palette={theme.sprinkles} area="burst" seed={11} count={12} size={10} />
        <div className="absolute inset-0 flex items-center justify-center">
          <ThemedImage
            src={theme.assets.welcome}
            width={ART}
            height={ART}
            priority
            fallback={<BalloonsSvg accent={theme.accent} accent2={theme.accent2} className="h-full w-full" />}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
