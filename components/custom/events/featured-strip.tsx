'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Event } from '@/types/event'
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils'

const CATEGORY_BADGE: Record<string, string> = {
  nightlife: '🎉 Nightlife',
  family: '👨‍👩‍👧‍👦 Family',
  music: '🎸 Music',
  movies: '🎬 Movies',
  dining: '🍽️ Dining',
  sports: '⚽ Sports',
  arts: '🎨 Arts',
}

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return 'Free'
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return 'Price TBA'
}

export function FeaturedStrip({ events }: { events: Event[] }) {
  if (events.length === 0) return null

  return (
    <section className="pt-8 pb-6 mb-2">
      <div className="flex items-center justify-between mb-4 px-4 mx-auto max-w-[1200px]">
        <h2 className="font-header text-xl font-bold text-white">⭐ Featured in Rochester</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory mx-auto max-w-[1200px]">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group shrink-0 snap-start w-80 rounded-2xl overflow-hidden border border-border bg-surface hover:border-accent-primary/50 transition-all"
          >
            <div className="relative aspect-[16/9] bg-surface-elevated overflow-hidden">
              <img
                src={getEventImage(event.flyer_image_url, event.category)}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_EVENT_IMAGE
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

              {/* Category badge top-left */}
              {event.category && (
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                  {CATEGORY_BADGE[event.category] ?? event.category}
                </span>
              )}

              {/* Featured badge top-right */}
              <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                ⭐ Featured
              </span>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-bold text-base text-white line-clamp-2 group-hover:text-accent-primary transition-colors leading-tight mb-1">
                  {event.name}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#7DD8E8]">
                    {format(parseISO(event.event_date), 'MMM d · h:mm a')}
                  </p>
                  <p className="text-xs font-semibold text-accent-primary">
                    {formatPrice(event)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
