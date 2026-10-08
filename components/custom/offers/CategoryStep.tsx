'use client'

import type { CategoryFieldGroup } from './categoryFields'
import { cardClass } from './styles'

interface CategoryStepProps {
  categoryName: string | null
  group: CategoryFieldGroup | null
  profileHref: string
}

export function CategoryStep({ categoryName, group, profileHref }: CategoryStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-header text-3xl font-bold text-white leading-tight">What do you offer?</h1>
        <p className="font-sans text-base text-white/70">
          We use your category to ask the right questions, so your offer reads like you.
        </p>
      </div>

      {categoryName ? (
        <>
          <div className={`${cardClass} p-5 space-y-1`}>
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8] font-label">Your category</p>
            <p className="font-header text-2xl font-bold text-white">{categoryName}</p>
            <p className="font-sans text-sm text-white/50">
              From your partner profile.{' '}
              <a href={profileHref} className="text-[#1AC8ED] hover:underline">
                Change it there
              </a>{' '}
              if it’s not right.
            </p>
          </div>

          <div className={`${cardClass} p-5 space-y-3`}>
            <p className="font-sans text-sm font-semibold text-white">
              {group ? 'You’ll also tell us about:' : 'No extra questions for this category.'}
            </p>
            {group ? (
              <ul className="space-y-2">
                {group.fields.map((f) => (
                  <li key={f.key} className="flex items-center gap-3 font-sans text-sm text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59FFA0] shrink-0" />
                    {f.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-sm text-white/60">
                Next you’ll name your offer, set a price and list what’s included.
              </p>
            )}
          </div>
        </>
      ) : (
        <div role="alert" className="p-5 rounded-2xl border bg-red-500/10 border-red-500/30 space-y-2">
          <p className="font-sans text-sm font-semibold text-red-400">Your partner profile doesn’t have a category yet.</p>
          <p className="font-sans text-sm text-white/70">
            Offers are filed under your category, so pick one before building an offer.
          </p>
          <a
            href={profileHref}
            className="inline-flex min-h-12 items-center text-sm font-medium text-[#1AC8ED] hover:underline"
          >
            ← Set your category
          </a>
        </div>
      )}
    </div>
  )
}
