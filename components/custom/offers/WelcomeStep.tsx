'use client'

import { Cake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardClass, text } from './styles'
import { HighlightedText } from './themed/HighlightedText'

const HIGHLIGHTS = [
  { title: 'Tell us what you offer', body: 'Your category shapes the questions, so it only takes a few minutes.' },
  { title: 'Set your price and what’s included', body: 'Package it the way you’d pitch it in person.' },
  { title: 'Go live after a quick review', body: 'Our team takes a look, then birthday planners can find you.' },
]

const HEADLINE = 'Become an RTNY Birthday Partner'

interface WelcomeStepProps {
  partnerName: string
  // Campaign themes draw one headline word in their accent color...
  highlight?: { word: string; color: string }
  // ...and supply their own illustration, so the cake icon is hidden.
  hideIcon?: boolean
}

export function WelcomeStep({ partnerName, highlight, hideIcon }: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {!hideIcon && (
          <div className="w-12 h-12 rounded-2xl bg-[#59FFA0]/10 border border-[#59FFA0]/20 flex items-center justify-center">
            <Cake className="w-6 h-6 text-[#59FFA0]" aria-hidden="true" />
          </div>
        )}
        <h1 className={text.pageTitle}>
          {highlight ? <HighlightedText text={HEADLINE} word={highlight.word} color={highlight.color} /> : HEADLINE}
        </h1>
        <p className={text.body}>
          People across Rochester plan birthdays on RTNY every week. Build an offer for{' '}
          <span className="text-white font-medium">{partnerName}</span> and show up right when they’re
          deciding where to celebrate.
        </p>
      </div>

      <ol className="space-y-4">
        {HIGHLIGHTS.map((item, i) => (
          <li key={item.title} className={cn(cardClass, 'flex gap-4 p-5')}>
            <span className="w-8 h-8 shrink-0 rounded-full bg-[#1AC8ED]/10 text-[#1AC8ED] font-header font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="space-y-1 min-w-0">
              <p className="font-sans text-base font-semibold text-white">{item.title}</p>
              <p className={text.helper}>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
