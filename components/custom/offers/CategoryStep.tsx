'use client'

import type { CategoryConfig } from './categoryFields'
import { cn } from '@/lib/utils'
import { cardClass, space, text } from './styles'

interface CategoryStepProps {
  categoryName: string | null
  config: CategoryConfig
  profileHref: string
}

export function CategoryStep({ categoryName, config, profileHref }: CategoryStepProps) {
  const group = config.requirements
  return (
    <div className={space.sections}>
      <div className="space-y-3">
        <h1 className={text.pageTitle}>What do you offer?</h1>
        <p className={text.body}>
          We use your category to ask the right questions, so your offer reads like you.
        </p>
      </div>

      {categoryName ? (
        <>
          <div className={`${cardClass} p-5 space-y-2`}>
            <p className={cn(text.eyebrow, 'text-[#7DD8E8]')}>Your category</p>
            <p className={cn(text.cardHeading, 'break-words')}>{categoryName}</p>
            <p className={text.helper}>
              From your partner profile.{' '}
              <a href={profileHref} className="text-[#1AC8ED] hover:underline">
                Change it there
              </a>{' '}
              if it’s not right.
            </p>
          </div>

          <div className={`${cardClass} p-5 space-y-4`}>
            <p className={text.fieldLabel}>
              {group ? 'You’ll also tell us about:' : 'No extra questions for this category.'}
            </p>
            {group ? (
              <ul className="space-y-3">
                {group.fields.map((f) => (
                  <li key={f.key} className="flex items-center gap-3 font-sans text-base text-white/75">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59FFA0] shrink-0" />
                    {f.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={text.helper}>
                Next you’ll name your offer, set a price and list what’s included.
              </p>
            )}
          </div>
        </>
      ) : (
        <div role="alert" className="p-5 rounded-2xl border bg-red-500/10 border-red-500/30 space-y-3">
          <p className="font-sans text-base font-semibold text-red-400">Your partner profile doesn’t have a category yet.</p>
          <p className={text.body}>
            Offers are filed under your category, so pick one before building an offer.
          </p>
          <a
            href={profileHref}
            className="inline-flex min-h-12 items-center text-base font-medium text-[#1AC8ED] hover:underline"
          >
            ← Set your category
          </a>
        </div>
      )}
    </div>
  )
}
