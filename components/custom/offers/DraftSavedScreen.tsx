'use client'

import type { OfferRecord } from './types'
import { formatPrice, pricingModelLabel } from './types'
import { OfferStatusBadge } from './OfferStatusBadge'
import { cardClass, priceFontClass } from './styles'

interface DraftSavedScreenProps {
  offer: OfferRecord
  categoryName: string | null
  exitHref: string
}

function guestRange(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? `${min} guests` : `${min}–${max} guests`
  if (min != null) return `${min}+ guests`
  if (max != null) return `Up to ${max} guests`
  return null
}

// Temporary end of the flow until steps 4-7 exist.
export function DraftSavedScreen({ offer, categoryName, exitHref }: DraftSavedScreenProps) {
  const includes = Array.isArray(offer.includes) ? offer.includes.filter((i): i is string => typeof i === 'string') : []
  const facts = [
    guestRange(offer.min_guests, offer.max_guests),
    offer.duration_hours != null ? `${offer.duration_hours} hr${offer.duration_hours === 1 ? '' : 's'}` : null,
    offer.advance_notice_hours != null ? `${offer.advance_notice_hours} hrs notice` : null,
  ].filter(Boolean) as string[]
  const savedLabel = offer.status === 'draft' ? 'Draft saved' : 'Changes saved'

  return (
    <div className="space-y-6">
      <div className="space-y-2" role="status">
        <p className="text-xs uppercase tracking-wider text-[#59FFA0] font-label">{savedLabel}</p>
        <h1 className="font-header text-3xl font-bold text-white leading-tight">Looking good.</h1>
        <p className="font-sans text-base text-white/70">
          Your offer is saved. Photos, availability and your pitch come next. You can pick this up any time
          from your offers list.
        </p>
      </div>

      <div className={`${cardClass} p-5 space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {categoryName && <p className="text-xs text-[#7DD8E8] font-sans">{categoryName}</p>}
            <h2 className="font-header text-2xl font-bold text-white break-words">{offer.title}</h2>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold text-[#59FFA0] tabular-nums ${priceFontClass}`}>
            {formatPrice(offer.price)}
          </span>
          {pricingModelLabel(offer.pricing_model) && (
            <span className="text-sm text-white/50 font-sans">{pricingModelLabel(offer.pricing_model)}</span>
          )}
        </div>

        {facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {facts.map((f) => (
              <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 font-sans">
                {f}
              </span>
            ))}
          </div>
        )}

        {offer.description && (
          <p className="font-sans text-sm text-white/70 leading-relaxed whitespace-pre-line">{offer.description}</p>
        )}

        {includes.length > 0 && (
          <ul className="space-y-1.5">
            {includes.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-white/80 font-sans">
                <span className="text-[#59FFA0]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {offer.status === 'needs_changes' && offer.review_note && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 font-sans">
            <span className="font-semibold">Reviewer note: </span>
            {offer.review_note}
          </div>
        )}
      </div>

      <a href={exitHref} className="inline-flex min-h-12 items-center text-sm font-medium text-[#1AC8ED] hover:underline">
        ← Back to birthday offers
      </a>
    </div>
  )
}
