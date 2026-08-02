'use client'

import { AdSlot } from '@/components/custom/ads/ad-slot'

export function FeaturedAdBanner() {
  return (
    <section className="w-full px-4 py-6">
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-[#1C1B1E] border border-white/[0.06]"
        style={{ minHeight: '480px' }}
      >
        <AdSlot placementKey="premium_spotlight" className="w-full h-full" />
      </div>
    </section>
  )
}
