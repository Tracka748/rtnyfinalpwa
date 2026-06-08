"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import type { Event } from "@/lib/homepage/types"
import { getCategoryColor } from "@/lib/homepage/utils"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

interface EventCardProps {
  event: Event
  size?: "small" | "medium"
  isSaved?: boolean
  onToggleSave?: () => void
}

export function EventCard({ event, size = "small", isSaved = false, onToggleSave }: EventCardProps) {
  const [imageSrc, setImageSrc] = useState(() => getEventImage(event.image, event.category))
  const [pulse, setPulse] = useState(false)

  const cardWidth = size === "small" ? "w-[220px]" : "w-[280px]"
  const imageHeight = size === "small" ? "h-[120px]" : "h-[160px]"
  const cardHeight = size === "small" ? "h-[260px]" : "h-[340px]"

  const categoryColor = getCategoryColor(event.category)
  const href = `/events/${event.id}`

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPulse(true)
    setTimeout(() => setPulse(false), 300)
    onToggleSave?.()
  }

  return (
    <Link href={href} className={`${cardWidth} ${cardHeight} shrink-0 snap-start`}>
      <div className="relative h-full rounded-xl border border-border bg-surface overflow-hidden transition-all hover:border-accent-primary hover:shadow-lg group cursor-pointer flex flex-col">

        {/* Image */}
        <div className={`relative ${imageHeight} w-full shrink-0 overflow-hidden bg-surface-elevated`}>
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            onError={() => setImageSrc(DEFAULT_EVENT_IMAGE)}
          />

          {/* Category pill — top left */}
          <div className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${categoryColor}`}>
            {event.category}
          </div>

          {/* Heart button — top right */}
          <button
            type="button"
            onClick={handleSaveClick}
            aria-label={isSaved ? 'Unsave event' : 'Save event'}
            className={`absolute top-2 right-2 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm transition-transform ${pulse ? 'scale-125' : 'active:scale-90'}`}
          >
            <Heart
              size={14}
              fill={isSaved ? '#ef4444' : 'none'}
              stroke={isSaved ? '#ef4444' : 'rgba(255,255,255,0.75)'}
              strokeWidth={2}
            />
          </button>
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 pb-[12px]">

          {/* Event name */}
          <h3 className="text-[18px] font-semibold text-[#F9FDFF] text-center leading-snug line-clamp-2 pt-[12px] px-[14px] pb-[4px]">
            {event.title}
          </h3>

          {/* Venue */}
          <p className="text-[12px] text-[#1AC8ED] text-center px-[14px]">
            {event.venue}
          </p>

          {/* Deal description */}
          {event.deal && (
            <p className="text-[12px] text-[#59FFA0] italic text-center px-[14px] pt-[4px]">
              {event.deal}
            </p>
          )}

          {/* Event description */}
          {event.description && (
            <p className="text-[11px] text-[#F9FDFF] text-center px-[14px] pt-[2px] pb-[6px]">
              {event.description}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stat chips */}
          <div className="flex gap-[5px] mx-[12px]">
            <span className="flex-1 text-center bg-[#0d0f14] border-[0.5px] border-[rgba(255,255,255,0.08)] rounded-[6px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#59FFA0]">
              {event.price}
            </span>
            <span className="flex-1 text-center bg-[#0d0f14] border-[0.5px] border-[rgba(255,255,255,0.08)] rounded-[6px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#888888]">
              {event.time}
            </span>
            <span className="flex-1 text-center bg-[#0d0f14] border-[0.5px] border-[rgba(255,255,255,0.08)] rounded-[6px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#1AC8ED]">
              Available
            </span>
          </div>

        </div>
      </div>
    </Link>
  )
}
