"use client"

import { useEffect } from "react"
import { ArrowRight } from "lucide-react"

interface AnnouncementAd {
  id: string
  title: string
  image_url: string
  link_url: string | null
}

interface AnnouncementStripProps {
  icon?: string
  title: string
  subtitle: string
  highlight: string
  ctaText: string
  ctaLink: string
  onDismiss?: () => void
  backgroundImage?: string
  ad?: AnnouncementAd
}

function trackAdEvent(adId: string, eventType: 'impression' | 'click') {
  try {
    fetch('/api/v1/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: adId, event_type: eventType }),
    }).catch(() => {})
  } catch {
    // swallow — tracking must never affect the user experience
  }
}

export function AnnouncementStrip({
  title,
  subtitle,
  highlight,
  ctaText,
  ctaLink,
  onDismiss,
  backgroundImage = "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200&h=400&fit=crop",
  ad,
}: AnnouncementStripProps) {
  useEffect(() => {
    if (ad) {
      trackAdEvent(ad.id, 'impression')
    }
  }, [])

  const resolvedBackgroundImage = ad ? ad.image_url : backgroundImage
  const resolvedSubtitle = ad ? "Sponsored" : subtitle
  const resolvedTitle = ad ? ad.title : title
  const resolvedCtaText = ad ? "Learn More" : ctaText
  const resolvedCtaLink = ad ? (ad.link_url || '#') : ctaLink
  const resolvedOnDismiss = ad ? undefined : onDismiss

  function handleClick() {
    if (ad) {
      trackAdEvent(ad.id, 'click')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-4">
      <a
        href={resolvedCtaLink}
        onClick={handleClick}
        className="relative flex items-end overflow-hidden rounded-xl"
        style={{ height: "210px", backgroundImage: `url(${resolvedBackgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

        {/* Text content */}
        <div className="relative z-10 flex w-full items-end justify-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7DD8E8]">{resolvedSubtitle}</p>
            <h3 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{resolvedTitle}</h3>
            {!ad && <p className="mt-1 text-sm font-medium text-yellow-300">{highlight}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {resolvedCtaText}
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Optional dismiss */}
        {resolvedOnDismiss && (
          <button
            onClick={(e) => { e.preventDefault(); resolvedOnDismiss(); }}
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
