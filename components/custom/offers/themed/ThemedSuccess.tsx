'use client'

import type { ReactNode } from 'react'
import type { CampaignTheme } from '../themes'
import { ThemedHeader } from './ThemedHeader'
import { ThemedImage } from './ThemedImage'
import { GraffitiHeader } from './GraffitiHeader'
import { CelebrationSvg } from './fallbacks'

interface ThemedSuccessProps {
  theme: CampaignTheme
  // The offer's status badge, shown directly below the graffiti title.
  badge?: ReactNode
  // The existing confirmation screen (links unchanged).
  children: ReactNode
}

const ART = 128

// Decorations (max 2): the graffiti title and the success illustration.
export function ThemedSuccess({ theme, badge, children }: ThemedSuccessProps) {
  return (
    <div className="space-y-6">
      <ThemedHeader theme={theme} variant="full" />

      <GraffitiHeader
        title={theme.titles.success}
        level={1}
        size="hero"
        theme={theme}
        badge={badge}
        imageSrc={theme.assets.titleSuccess}
      />

      {/* Reserved 160px box so the art never shifts layout. */}
      <div className="relative mx-auto h-40 w-40" aria-hidden="true">
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
