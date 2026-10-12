'use client'

import type { ReactNode } from 'react'
import type { CampaignTheme } from '../themes'
import { Sprinkles } from './Sprinkles'
import { GraffitiHeader } from './GraffitiHeader'

interface ThemedReviewFrameProps {
  theme: CampaignTheme
  // The "Birthday Partner Preview" card, unchanged (content, Edit links).
  children: ReactNode
  // Short explainer shown directly under the "Preview" title (intro + tip).
  intro?: ReactNode
}

// Decorations (max 2): edge sprinkles in a reserved 32px band, and the "Preview"
// graffiti title (font mode, with its own cake icon) below it. Neither overlaps
// the card. The pink → baby-blue border is a 1px gradient ring around the card.
export function ThemedReviewFrame({ theme, children, intro }: ThemedReviewFrameProps) {
  return (
    <div
      className="rounded-[18px] p-px"
      style={{ background: `linear-gradient(135deg, ${theme.accent}66, ${theme.accent2}66)` }}
    >
      <div className="rounded-[17px] bg-[#121113]">
        <div className="relative h-8" aria-hidden="true">
          <Sprinkles palette={theme.sprinkles} area="edge" seed={31} count={5} />
        </div>
        <GraffitiHeader title={theme.titles.review} level={2} size="section" theme={theme} className="px-4 pb-3" />
        {intro && <div className="space-y-2 px-5 pb-4 text-center">{intro}</div>}
        {children}
      </div>
    </div>
  )
}
