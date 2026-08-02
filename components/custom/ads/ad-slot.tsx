'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Ad {
  id: string
  image_url: string
  link_url: string | null
  title: string
}

interface AdSlotProps {
  placementKey: string
  className?: string
}

function trackEvent(adId: string, eventType: 'impression' | 'click') {
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

export function AdSlot({ placementKey, className }: AdSlotProps) {
  const [ad, setAd] = useState<Ad | null>(null)
  const impressionFired = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function fetchAd() {
      try {
        const response = await fetch(`/api/v1/ads?placement=${encodeURIComponent(placementKey)}`)
        const result = await response.json()
        if (!cancelled && result.ad) {
          setAd(result.ad)
        }
      } catch {
        // silently render nothing on failure
      }
    }

    fetchAd()

    return () => {
      cancelled = true
    }
  }, [placementKey])

  if (!ad) {
    return null
  }

  const image = (
    <img
      src={ad.image_url}
      alt={ad.title}
      className="w-full h-full object-cover rounded-2xl"
      onLoad={() => {
        if (!impressionFired.current) {
          impressionFired.current = true
          trackEvent(ad.id, 'impression')
        }
      }}
    />
  )

  if (!ad.link_url) {
    return <div className={cn('absolute inset-0', className)}>{image}</div>
  }

  const isExternal = !ad.link_url.startsWith('/')

  return (
    <a
      href={ad.link_url}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={cn('absolute inset-0', className)}
      onClick={() => trackEvent(ad.id, 'click')}
    >
      {image}
    </a>
  )
}
