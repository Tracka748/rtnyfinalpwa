'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { cardClass, sectionCard, space, text } from './styles'
import { SECTION_COPY, type SectionKey } from './sectionCopy'
import { useCampaignTheme } from './themes/ThemeContext'
import { SectionHeading } from './themed/SectionHeading'

// Wizard section card: themed heading (the `tag` sits on its own line below the
// title), intro, cyan 💡 tip, optional example and note, then the fields. Copy comes
// from SECTION_COPY.
export function SectionCard({
  id,
  copyKey,
  title,
  note,
  tag,
  children,
}: {
  id?: string
  copyKey: SectionKey
  title: string
  // Extra line after the tip (e.g. "Just for Rooftop.").
  note?: string
  tag?: ReactNode
  children: ReactNode
}) {
  const copy = SECTION_COPY[copyKey]
  const theme = useCampaignTheme()
  return (
    <section id={id} className={cn(cardClass, sectionCard.border, 'p-5', space.fields)}>
      <div className="space-y-3">
        <SectionHeading title={title} badge={tag} theme={theme} />
        <p className={text.sectionIntro}>{copy.intro}</p>
        <p className={text.sectionTip}>
          <span aria-hidden="true">💡 </span>
          {copy.tip}
        </p>
        {copy.example && <p className={cn(text.helper, 'break-words')}>Example: {copy.example}</p>}
        {note && <p className={text.helper}>{note}</p>}
      </div>
      {children}
    </section>
  )
}
