'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { OfferRecord } from './types'
import { offerPriceDisplay } from './types'
import { OfferStatusBadge } from './OfferStatusBadge'
import { FormBanner, type BannerState } from './FormBanner'
import { cardClass, priceFontClass } from './styles'

interface OfferListProps {
  partnerId: string
  // Wizard route; existing offers open at `${wizardHref}?offer=<id>`.
  wizardHref: string
}

const LOAD_ERRORS: Record<number, string> = {
  401: 'Your session has expired. Sign in again to see your offers.',
  403: 'You don’t have access to this partner’s offers.',
}

export function NewOfferButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 px-5 rounded-xl bg-[#59FFA0] text-[#121113] font-header font-bold text-base hover:bg-[#59FFA0]/90 transition-colors"
    >
      <Plus className="w-4 h-4" />
      New birthday offer
    </a>
  )
}

export function OfferList({ partnerId, wizardHref }: OfferListProps) {
  const [offers, setOffers] = useState<OfferRecord[] | null>(null)
  const [error, setError] = useState<BannerState | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1/partners/${partnerId}/offers`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError({ type: 'error', message: LOAD_ERRORS[res.status] ?? 'We couldn’t load offers. Please try again.' })
          setOffers([])
          return
        }
        setOffers((json.data as OfferRecord[]) ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setError({ type: 'error', message: 'We couldn’t load offers. Check your connection and try again.' })
        setOffers([])
      })
    return () => {
      cancelled = true
    }
  }, [partnerId])

  if (offers === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) return <FormBanner banner={error} />

  if (offers.length === 0) {
    return (
      <div className={`${cardClass} p-8 text-center space-y-4`}>
        <div className="space-y-1">
          <p className="font-header text-xl font-bold text-white">No birthday offers yet</p>
          <p className="font-sans text-sm text-white/60">
            Build your first one in a few minutes. It stays a draft until you submit it.
          </p>
        </div>
        <NewOfferButton href={wizardHref} />
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {offers.map((offer) => (
        <li key={offer.id}>
          <a
            href={`${wizardHref}?offer=${offer.id}`}
            className={`${cardClass} flex items-center gap-4 p-4 min-h-12 hover:border-white/25 transition-colors`}
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="font-header text-lg font-bold text-white break-words">{offer.title}</p>
                <OfferStatusBadge status={offer.status} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold text-[#59FFA0] tabular-nums ${priceFontClass}`}>
                  {offerPriceDisplay(offer).price}
                </span>
                {offerPriceDisplay(offer).qualifier && (
                  <span className="text-xs text-white/50 font-sans">{offerPriceDisplay(offer).qualifier}</span>
                )}
              </div>
              {offer.status === 'needs_changes' && offer.review_note && (
                <p className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 font-sans">
                  <span className="font-semibold">Reviewer note: </span>
                  {offer.review_note}
                </p>
              )}
              <p className="text-xs text-white/40 font-sans">
                Updated {new Date(offer.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 text-white/30" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}
