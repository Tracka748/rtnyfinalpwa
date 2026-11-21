'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift } from 'lucide-react'
import { guestRangeLabel } from '@/lib/package-page-format'
import { tintForKey } from '@/lib/package-browse'
import { safeExternalUrl } from '@/lib/safe-url'
import type { PublicCard } from '@/lib/theme-package-public'

const TINT = { mint: '#59FFA0', cyan: '#1AC8ED' } as const

/** One package on the browse page. The whole card is a real link to the package page. */
export function PackageCard({ card }: { card: PublicCard }) {
  const [imageFailed, setImageFailed] = useState(false)
  const tint = TINT[tintForKey(card.key)]
  const cover = safeExternalUrl(card.cover_image_url)
  const guests = guestRangeLabel(card.min_guests, card.max_guests)

  return (
    <Link
      href={`/packages/${card.key}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] touch-manipulation transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#59FFA0]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {cover && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center"
            style={{ background: `radial-gradient(circle at 30% 20%, ${tint}40 0%, transparent 60%), linear-gradient(135deg, ${tint}1F 0%, #1a1a1a 75%)` }}
          >
            <Gift size={44} color={tint} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <span
          className="font-label break-words text-[10px] font-medium uppercase tracking-widest"
          style={{ color: tint }}
        >
          {card.occasion}
        </span>
        <h2 className="font-header break-words text-xl font-bold leading-tight text-[#F9FDFF]">{card.title}</h2>
        {card.subtitle && (
          <p className="font-sans line-clamp-2 break-words text-sm leading-snug text-[#a8a8a8]">{card.subtitle}</p>
        )}
        {(card.price_note || guests) && (
          <div className="mt-auto flex flex-col gap-0.5 pt-2">
            {card.price_note && (
              <span className="font-sans break-words text-sm font-medium" style={{ color: tint }}>{card.price_note}</span>
            )}
            {guests && <span className="font-sans text-xs text-white/50">{guests}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
