'use client'

import { cn } from '@/lib/utils'
import type { OfferRecord } from './types'
import { priceWording } from './offerReview'
import { OfferStatusBadge } from './OfferStatusBadge'
import { cardClass, priceFontClass, sectionCard, space, text } from './styles'

interface SubmittedScreenProps {
  offer: OfferRecord
  categoryName: string | null
  exitHref: string
  // Campaign accent for the status line (default mint).
  statusColor?: string
  // Themed screens show a graffiti h1 and the status badge above this content.
  headingAs?: 'h1' | 'h2'
  hideBadge?: boolean
}

// Shown after PATCH action 'submit' succeeds.
export function SubmittedScreen({
  offer,
  categoryName,
  exitHref,
  statusColor,
  headingAs: Heading = 'h1',
  hideBadge,
}: SubmittedScreenProps) {
  return (
    <div className={space.sections}>
      <div className="space-y-3" role="status">
        <p className={cn(text.eyebrow, !statusColor && 'text-[#59FFA0]')} style={statusColor ? { color: statusColor } : undefined}>
          Submitted for review
        </p>
        <Heading className={text.pageTitle}>Nice work. It’s with our team.</Heading>
        <p className={text.body}>
          We’ll take a look and put it live once it’s approved. If anything needs a tweak, you’ll see a note on the
          offer in your list.
        </p>
      </div>

      <div className={cn(cardClass, sectionCard.border, 'p-5 space-y-3')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {categoryName && <p className="text-sm text-[#7DD8E8] font-sans">{categoryName}</p>}
            <h2 className={cn(text.cardHeading, 'break-words')}>{offer.title}</h2>
          </div>
          {!hideBadge && <OfferStatusBadge status={offer.status} />}
        </div>
        <p className={cn('text-2xl font-bold text-[#59FFA0]', priceFontClass)}>{priceWording(offer)}</p>
      </div>

      <a href={exitHref} className="inline-flex min-h-12 items-center text-base font-medium text-[#1AC8ED] hover:underline">
        ← Back to birthday offers
      </a>
    </div>
  )
}
