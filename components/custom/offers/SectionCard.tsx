'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { cardClass, sectionCard, space, text } from './styles'
import { SECTION_COPY, type SectionKey } from './sectionCopy'

// Wizard section card: mint emoji heading, intro, cyan 💡 tip, optional example
// and note, then the fields. Copy comes from SECTION_COPY.
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
  return (
    <section id={id} className={cn(cardClass, sectionCard.border, 'p-5', space.fields)}>
      <div className="space-y-3">
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
          <h2 className={cn(text.cardHeading, sectionCard.heading, 'min-w-0 break-words')}>
            <span aria-hidden="true" className="mr-2">
              {copy.emoji}
            </span>
            {title}
          </h2>
          {tag}
        </div>
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
