'use client'

import type { ReactNode } from 'react'
import type { CampaignTheme } from '../themes'
import { ThemedHeader } from './ThemedHeader'
import { ThemedImage } from './ThemedImage'
import { Sprinkles } from './Sprinkles'
import { CelebrationSvg } from './fallbacks'

interface ThemedSuccessProps {
  theme: CampaignTheme
  // The existing confirmation screen (status badge and links unchanged).
  children: ReactNode
}

const ART = 128

// Decorations (max 2): the success illustration and a sprinkle burst around it.
export function ThemedSuccess({ theme, children }: ThemedSuccessProps) {
  return (
    <div className="space-y-6">
      <ThemedHeader theme={theme} variant="full" />

      {/* Reserved 160px box so the art never shifts layout. */}
      <div className="relative mx-auto h-40 w-40" aria-hidden="true">
        <Sprinkles palette={theme.sprinkles} area="burst" seed={23} count={12} size={10} />
        <div className="absolute inset-0 flex items-center justify-center">
          <ThemedImage
            src={theme.assets.success}
            width={ART}
            height={ART}
            priority
            fallback={<CelebrationSvg accent={theme.accent} accent2={theme.accent2} className="h-full w-full" />}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
