'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useSavedEvents } from '@/hooks/useSavedEvents'

export type EventCategory =
  | 'nightlife'
  | 'family'
  | 'movies'
  | 'dining'
  | 'arts'
  | 'sports'
  | 'music'
  | 'festivals'
export type EventDay = 'tonight' | 'tomorrow' | 'weekend'

export interface WeekEvent {
  id: string
  name: string
  venue: string
  time: string
  price?: string
  category: EventCategory
  day?: EventDay
  imageUrl: string | null
  description?: string
}

const CATEGORY_STYLE: Record<EventCategory, { bg: string; icon: string }> = {
  nightlife: { bg: 'bg-[#8B5CF6]', icon: '🎉' },
  family: { bg: 'bg-[#F59E0B]', icon: '👨‍👩‍👧‍👦' },
  dining: { bg: 'bg-[#EC4899]', icon: '🍽️' },
  arts: { bg: 'bg-[#EAB308]', icon: '🎨' },
  movies: { bg: 'bg-[#EF4444]', icon: '🎬' },
  sports: { bg: 'bg-[#22C55E]', icon: '⚽' },
  music: { bg: 'bg-[#1AC8ED]', icon: '🎵' },
  festivals: { bg: 'bg-[#F97316]', icon: '🎪' },
}

const DEFAULT_STYLE = { bg: 'bg-[#3a3a3c]', icon: '📅' }

function categoryStyle(category: EventCategory) {
  return CATEGORY_STYLE[category] ?? DEFAULT_STYLE
}

export function EventCardWeek({ event }: { event: WeekEvent }) {
  const { isSaved, toggleSave } = useSavedEvents()
  const [pulse, setPulse] = useState(false)
  const style = categoryStyle(event.category)
  const hasImage = Boolean(event.imageUrl && event.imageUrl.trim())

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPulse(true)
    setTimeout(() => setPulse(false), 300)
    toggleSave(event.id)
  }

  return (
    <Link href={`/events/${event.id}`}>
      <div
        className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/[0.06] focus:outline-none transition-transform active:scale-[0.98]"
        aria-label={`${event.name} at ${event.venue}, ${event.time}${event.price ? `, ${event.price}` : ''}`}
      >
        {hasImage ? (
          <img
            src={event.imageUrl!}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${style.bg}`}>
            <span className="text-5xl opacity-60">{style.icon}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleSaveClick}
          aria-label={isSaved(event.id) ? 'Unsave event' : 'Save event'}
          className={`absolute top-2 left-2 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm transition-transform ${pulse ? 'scale-125' : 'active:scale-90'}`}
        >
          <Heart
            size={14}
            fill={isSaved(event.id) ? '#ef4444' : 'none'}
            stroke={isSaved(event.id) ? '#ef4444' : 'rgba(255,255,255,0.75)'}
            strokeWidth={2}
          />
        </button>
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-label font-semibold uppercase tracking-wide text-white ${style.bg}`}>
          {event.category}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-0.5">
          <h3 className="font-slab-serif font-bold text-sm text-[#F9FDFF] leading-tight line-clamp-2">
            {event.name}
          </h3>
          <p className="font-label text-[10px] text-[#7A7978] uppercase tracking-wide">
            {event.time}
          </p>
          {event.price && (
            <p className="font-label text-xs font-semibold text-[#59FFA0]">
              {event.price}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export function EventRowWeek({ event }: { event: WeekEvent }) {
  const style = categoryStyle(event.category)
  const hasImage = Boolean(event.imageUrl && event.imageUrl.trim())

  return (
    <div className="group flex items-center gap-4 py-4 px-2 border-b border-white/[0.06] last:border-b-0 hover:bg-[#1C1B1E] transition-colors cursor-pointer rounded-lg">
      <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden">
        {hasImage ? (
          <img
            src={event.imageUrl!}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${style.bg}`}>
            <span className="text-3xl opacity-60">{style.icon}</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-label font-semibold uppercase tracking-wide text-white ${style.bg}`}>
            {event.category}
          </span>
          <h3 className="font-slab-serif font-bold text-lg text-[#F97316] leading-tight truncate">
            {event.name}
          </h3>
          <p className="font-label text-sm text-[#1AC8ED]">
            {event.venue}
          </p>
          {event.description && (
            <p className="font-sans text-sm text-[#7A7978] italic line-clamp-1">
              {event.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="font-label text-sm text-[#7A7978]">{event.time}</p>
          {event.price && (
            <p className="font-label font-bold text-lg text-[#59FFA0]">{event.price}</p>
          )}
          <button
            type="button"
            className="px-4 py-1.5 rounded-full border border-[#59FFA0] text-[#59FFA0] font-label text-sm font-medium hover:bg-[#59FFA0] hover:text-[#121113] transition-colors"
          >
            Get Tickets →
          </button>
        </div>
      </div>
    </div>
  )
}
