'use client'

import type { OfferRecord } from './types'
import { offerPriceDisplay } from './types'
import { guestLabel } from './categoryFields'
import { OfferStatusBadge } from './OfferStatusBadge'
import { cn } from '@/lib/utils'
import { cardClass, priceFontClass, space, text } from './styles'

interface DraftSavedScreenProps {
  offer: OfferRecord
  categoryName: string | null
  exitHref: string
}

function guestRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? `${guestLabel(min)} guests` : `${guestLabel(min)}–${guestLabel(max)} guests`
  if (min != null) return `${guestLabel(min)}+ guests`
  if (max != null) return `Up to ${guestLabel(max)} guests`
  return null
}

function detailText(details: unknown, key: string): string | null {
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return null
  const v = (details as Record<string, unknown>)[key]
  return typeof v === 'string' && v ? v : null
}

// Temporary end of the flow until steps 4-7 exist.
export function DraftSavedScreen({ offer, categoryName, exitHref }: DraftSavedScreenProps) {
  const includes = Array.isArray(offer.includes) ? offer.includes.filter((i): i is string => typeof i === 'string') : []
  const durationLabel = detailText(offer.details, 'duration_label')
  const noticeLabel = detailText(offer.details, 'notice_label')
  const facts = [
    guestRange(offer.min_guests, offer.max_guests),
    durationLabel ?? (offer.duration_hours != null ? `${offer.duration_hours} hrs` : null),
    noticeLabel ? (noticeLabel.startsWith('I’ll') ? noticeLabel : `${noticeLabel} notice`) : null,
  ].filter(Boolean) as string[]
  const { price, qualifier } = offerPriceDisplay(offer)
  const savedLabel = offer.status === 'draft' ? 'Draft saved' : 'Changes saved'

  return (
    <div className={space.sections}>
      <div className="space-y-3" role="status">
        <p className={cn(text.eyebrow, 'text-[#59FFA0]')}>{savedLabel}</p>
        <h1 className={text.pageTitle}>Looking good.</h1>
        <p className={text.body}>
          Your offer is saved. Photos, availability and your pitch come next. You can pick this up any time
          from your offers list.
        </p>
      </div>

      <div className={`${cardClass} p-5 space-y-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {categoryName && <p className="text-sm text-[#7DD8E8] font-sans">{categoryName}</p>}
            <h2 className={cn(text.cardHeading, 'break-words')}>{offer.title}</h2>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-3xl font-bold text-[#59FFA0] tabular-nums ${priceFontClass}`}>
            {price}
          </span>
          {qualifier && <span className={text.helper}>{qualifier}</span>}
        </div>

        {facts.length > 0 && (
          <div className={cn('flex flex-wrap', space.chips)}>
            {facts.map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 font-sans">
                {f}
              </span>
            ))}
          </div>
        )}

        {offer.description && (
          <p className={cn(text.body, 'whitespace-pre-line break-words')}>{offer.description}</p>
        )}

        {includes.length > 0 && (
          <ul className="space-y-2">
            {includes.map((item) => (
              <li key={item} className="flex gap-2 text-base text-white/85 font-sans break-words min-w-0">
                <span className="text-[#59FFA0]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {offer.status === 'needs_changes' && offer.review_note && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-base text-red-300 font-sans break-words">
            <span className="font-semibold">Reviewer note: </span>
            {offer.review_note}
          </div>
        )}
      </div>

      <a href={exitHref} className="inline-flex min-h-12 items-center text-base font-medium text-[#1AC8ED] hover:underline">
        ← Back to birthday offers
      </a>
    </div>
  )
}
