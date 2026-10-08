'use client'

import { Cake } from 'lucide-react'

const HIGHLIGHTS = [
  { title: 'Tell us what you offer', body: 'Your category shapes the questions, so it only takes a few minutes.' },
  { title: 'Set your price and what’s included', body: 'Package it the way you’d pitch it in person.' },
  { title: 'Go live after a quick review', body: 'Our team takes a look, then birthday planners can find you.' },
]

export function WelcomeStep({ partnerName }: { partnerName: string }) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#59FFA0]/10 border border-[#59FFA0]/20 flex items-center justify-center">
          <Cake className="w-6 h-6 text-[#59FFA0]" aria-hidden="true" />
        </div>
        <h1 className="font-header text-3xl sm:text-4xl font-bold text-white leading-tight">
          Become an RTNY Birthday Partner
        </h1>
        <p className="font-sans text-base text-white/70 leading-relaxed">
          People across Rochester plan birthdays on RTNY every week. Build an offer for{' '}
          <span className="text-white font-medium">{partnerName}</span> and show up right when they’re
          deciding where to celebrate.
        </p>
      </div>

      <ol className="space-y-3">
        {HIGHLIGHTS.map((item, i) => (
          <li key={item.title} className="flex gap-4 bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
            <span className="w-8 h-8 shrink-0 rounded-full bg-[#1AC8ED]/10 text-[#1AC8ED] font-header font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="space-y-0.5">
              <p className="font-sans text-sm font-semibold text-white">{item.title}</p>
              <p className="font-sans text-sm text-white/60">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
