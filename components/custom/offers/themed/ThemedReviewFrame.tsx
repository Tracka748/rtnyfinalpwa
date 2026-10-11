'use client'

import type { ReactNode } from 'react'
import type { CampaignTheme } from '../themes'
import { ThemedImage } from './ThemedImage'
import { Sprinkles } from './Sprinkles'
import { PartyHatSvg } from './fallbacks'

interface ThemedReviewFrameProps {
  theme: CampaignTheme
  // The "Birthday Partner Preview" card, unchanged (content, Edit links).
  children: ReactNode
}

// Decorations (max 2): the party hat and edge sprinkles, both in a reserved 48px
// band above the card so they never cover preview text or Edit links. The
// pink → baby-blue border is a 1px gradient ring around the card.
export function ThemedReviewFrame({ theme, children }: ThemedReviewFrameProps) {
  return (
    <div
      className="rounded-[18px] p-px"
      style={{ background: `linear-gradient(135deg, ${theme.accent}66, ${theme.accent2}66)` }}
    >
      <div className="rounded-[17px] bg-[#121113]">
        <div className="relative h-12" aria-hidden="true">
          <Sprinkles palette={theme.sprinkles} area="edge" seed={31} count={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <ThemedImage
              src={theme.assets.hat}
              width={36}
              height={36}
              fallback={<PartyHatSvg accent={theme.accent} accent2={theme.accent2} className="h-full w-full" />}
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
