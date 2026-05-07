"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { PromoCard } from "@/lib/homepage/types"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

interface HeroPromoProps {
  promos: PromoCard[]
}

export function HeroPromo({ promos }: HeroPromoProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % promos.length)
    }, 5000)
  }, [promos.length])

  useEffect(() => {
    startInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startInterval])

  const goToIndex = (index: number) => {
    setActiveIndex(index)
    startInterval()
  }

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
      <div className="relative">
        {/* Active promo card */}
        <div
          className="relative h-[280px] overflow-hidden rounded-2xl border border-accent-primary/30 md:h-[360px]"
          style={{
            backgroundImage: `url('${promos[activeIndex].image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/20" />

          {/* Content */}
          <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-bold text-accent-primary backdrop-blur">
                👑 Earn {promos[activeIndex].points} pts
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-text-primary md:text-3xl">{promos[activeIndex].title}</h2>
            <p className="mb-4 text-sm text-[#7DD8E8] md:text-base">{promos[activeIndex].subtitle}</p>
            <div className="flex gap-3">
              <Button className="bg-accent-primary text-background hover:bg-accent-primary/90">
                {promos[activeIndex].cta}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
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
        </div>
      </div>
    </div>
  )
}
