"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Event } from "@/lib/homepage/types"
import { getCategoryColor } from "@/lib/homepage/utils"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

interface EventCardProps {
  event: Event
  size?: "small" | "medium"
}

export function EventCard({ event, size = "small" }: EventCardProps) {
  const [imageSrc, setImageSrc] = useState(() => getEventImage(event.image, event.category))
  const cardWidth = size === "small" ? "w-[220px]" : "w-[280px]"
  const imageHeight = size === "small" ? "h-[120px]" : "h-[180px]"
  const cardHeight = size === "small" ? "h-[240px]" : "h-[320px]"

  const categoryColor = getCategoryColor(event.category)

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const href = uuidRegex.test(event.id) ? `/events/${event.id}` : '/events'

  return (
    <Link href={href} className={`${cardWidth} ${cardHeight} shrink-0 snap-start`}>
      <div className="h-full rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-accent-primary hover:shadow-lg group cursor-pointer">
        {/* Image */}
        <div className={`relative ${imageHeight} w-full overflow-hidden bg-surface-elevated`}>
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            onError={() => {
              setImageSrc(DEFAULT_EVENT_IMAGE)
            }}
          />

          {/* Category badge */}
          <div className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${categoryColor}`}>
            {event.category}
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[140px] flex-col justify-between p-3">
          <div>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-text-primary">{event.title}</h3>
            <p className="mt-1 text-[13px] text-[#7DD8E8]">{event.venue}</p>
            <p className="text-[13px] text-[#7DD8E8]">
              {event.time} • {event.price}
            </p>
          </div>

          {/* Points badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-1 text-xs font-semibold text-accent-primary">
              +{event.points}pts
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
