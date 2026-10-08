'use client'

import type { ReactNode } from 'react'

export interface BannerState {
  type: 'success' | 'error'
  message: string
}

// Same local success/error banner used on the partner edit pages.
export function FormBanner({ banner, children }: { banner: BannerState | null; children?: ReactNode }) {
  if (!banner) return null
  return (
    <div
      role={banner.type === 'error' ? 'alert' : 'status'}
      className={[
        'p-4 rounded-xl border text-sm font-medium font-sans',
        banner.type === 'success'
          ? 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0]'
          : 'bg-red-500/10 border-red-500/30 text-red-400',
      ].join(' ')}
    >
      {banner.message}
      {children}
    </div>
  )
}
