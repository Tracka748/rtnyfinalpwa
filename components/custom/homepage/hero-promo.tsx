"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { PromoCard } from "@/lib/homepage/types"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

function trackAdEvent(adId: string, eventType: "impression" | "click") {
  try {
    fetch("/api/v1/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: adId, event_type: eventType }),
    }).catch(() => {})
  } catch {
    // swallow — tracking must never affect the user experience
  }
}

interface HeroPromoProps {
  promos: PromoCard[]
}

const SLIDE_DEFAULT_SECONDS = 5
// Hard stop for video slides, covers stalled or failed loads. Applies regardless of
// the ad's tier or any data attached to it.
const HERO_VIDEO_MAX_MS = 18_000

export function HeroPromo({ promos }: HeroPromoProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  // Bumped on every slide change so the timer restarts even when the index doesn't change.
  const [slideTick, setSlideTick] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slideStartedAtRef = useRef(Date.now())
  const lastTrackedAdId = useRef<string | null>(null)

  const activeVideoUrl = promos[activeIndex]?.videoUrl

  const goToIndex = useCallback((index: number) => {
    setActiveIndex(index)
    setSlideTick((t) => t + 1)
  }, [])

  // Per-slide timer, reset on every slide change (auto or manual).
  // Image slides advance after 5s; video slides wait for `ended` (see
  // handleVideoEnded) and fall back to the safety cap.
  useEffect(() => {
    slideStartedAtRef.current = Date.now()
    const ms = activeVideoUrl ? HERO_VIDEO_MAX_MS : SLIDE_DEFAULT_SECONDS * 1000
    slideTimerRef.current = setTimeout(() => {
      goToIndex((activeIndex + 1) % promos.length)
    }, ms)
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    }
    // promos is read only for its length; its identity changes on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slideTick, activeVideoUrl, promos.length, goToIndex])

  // Video finished: hold the last frame until the tier's minimum seconds have
  // passed since the slide became active, then advance.
  const handleVideoEnded = () => {
    const holdMs = Math.min(
      (promos[activeIndex]?.minSeconds ?? SLIDE_DEFAULT_SECONDS) * 1000,
      HERO_VIDEO_MAX_MS
    )
    const elapsedMs = Date.now() - slideStartedAtRef.current
    const waitMs = Math.max(0, holdMs - elapsedMs)
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current)
    slideTimerRef.current = setTimeout(() => {
      goToIndex((activeIndex + 1) % promos.length)
    }, waitMs)
  }

  useEffect(() => {
    const activePromo = promos[activeIndex]
    if (activePromo?.isAd && activePromo.adId && lastTrackedAdId.current !== activePromo.adId) {
      lastTrackedAdId.current = activePromo.adId
      trackAdEvent(activePromo.adId, "impression")
    }
  }, [activeIndex, promos])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const delta = touchStartX.current - touchEndX.current
    if (delta > 50) {
      goToIndex((activeIndex + 1) % promos.length)
    } else if (delta < -50) {
      goToIndex((activeIndex - 1 + promos.length) % promos.length)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl">
        {/* Active promo card */}
        <div
          className="relative h-[280px] overflow-hidden rounded-2xl border border-accent-primary/30 md:h-[360px]"
          style={{
            ...(promos[activeIndex].videoUrl
              ? {}
              : {
                  backgroundImage: `url('${promos[activeIndex].image}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }),
            boxShadow: 'inset 0 0 0 4px #121113',
            position: 'relative',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {promos[activeIndex].videoUrl && (
            <video
              key={promos[activeIndex].videoUrl}
              src={promos[activeIndex].videoUrl}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ zIndex: 0 }}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/20" />

          {/* Content */}
          <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              {promos[activeIndex].isAd ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-text-secondary backdrop-blur">
                  Sponsored
                </span>
              ) : (
                <span className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-bold text-accent-primary backdrop-blur">
                  👑 Earn {promos[activeIndex].points} pts
                </span>
              )}
            </div>
            <h2 className="mb-2 text-2xl font-bold text-text-primary md:text-3xl">{promos[activeIndex].title}</h2>
            <p className="mb-4 text-sm text-[#7DD8E8] md:text-base">{promos[activeIndex].subtitle}</p>
            <div className="flex gap-3">
              {promos[activeIndex].isAd ? (
                <a
                  href={promos[activeIndex].link}
                  target={promos[activeIndex].link.startsWith("/") ? undefined : "_blank"}
                  rel={promos[activeIndex].link.startsWith("/") ? undefined : "noopener noreferrer"}
                  onClick={() => {
                    const adId = promos[activeIndex].adId
                    if (adId) trackAdEvent(adId, "click")
                  }}
                >
                  <Button className="bg-accent-primary text-background hover:bg-accent-primary/90">
                    {promos[activeIndex].cta}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Button className="bg-accent-primary text-background hover:bg-accent-primary/90">
                  {promos[activeIndex].cta}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Dot indicators inside card */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {promos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? "w-8 bg-[#59FFA0]" : "w-2 bg-white/30"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Hard border overlay — covers image bleed and seam artifacts */}
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '4px solid #121113',
            borderRadius: 'inherit',
            pointerEvents: 'none',
            zIndex: 20,
          }} />
        </div>
      </div>
    </div>
  )
}
