"use client"

import { ArrowRight } from "lucide-react"

interface AnnouncementStripProps {
  icon?: string
  title: string
  subtitle: string
  highlight: string
  ctaText: string
  ctaLink: string
  onDismiss?: () => void
  backgroundImage?: string
}

export function AnnouncementStrip({
  title,
  subtitle,
  highlight,
  ctaText,
  ctaLink,
  onDismiss,
  backgroundImage = "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200&h=400&fit=crop",
}: AnnouncementStripProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-4">
      <a
        href={ctaLink}
        className="relative flex items-end overflow-hidden rounded-xl"
        style={{ height: "210px", backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

        {/* Text content */}
        <div className="relative z-10 flex w-full items-end justify-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7DD8E8]">{subtitle}</p>
            <h3 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h3>
            <p className="mt-1 text-sm font-medium text-yellow-300">{highlight}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Optional dismiss */}
        {onDismiss && (
          <button
            onClick={(e) => { e.preventDefault(); onDismiss(); }}
            className="absolute right-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </a>
    </div>
  )
}
