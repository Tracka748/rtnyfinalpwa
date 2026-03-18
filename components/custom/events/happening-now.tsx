'use client'

import Link from 'next/link'
import { Event } from '@/types/event'
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils'

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return 'Free'
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return 'Price TBA'
}

export function HappeningNow({ events }: { events: Event[] }) {
  if (events.length === 0) return null

  return (
    <section className="pt-6 pb-4 mb-2 mx-auto max-w-[1200px]">
      <div className="flex items-center gap-2 mb-4 px-4">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="font-header text-xl font-bold text-white">Happening Now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x px-4">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group shrink-0 snap-start w-56 flex gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:border-red-500/60 transition-all"
          >
            <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-surface-elevated">
              <img
                src={getEventImage(event.flyer_image_url, event.category)}
                alt={event.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_EVENT_IMAGE
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <span className="self-start text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse tracking-wider mb-0.5">
                LIVE
              </span>
              <h3 className="font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
                {event.name}
              </h3>
              {event.venue_name && (
                <p className="text-[10px] text-text-muted line-clamp-1">📍 {event.venue_name}</p>
              )}
              <p className="text-[10px] font-semibold text-accent-primary">{formatPrice(event)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
