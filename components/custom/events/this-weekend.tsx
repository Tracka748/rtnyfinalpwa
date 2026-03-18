'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Event } from '@/types/event'
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils'

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return 'Free'
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return 'Price TBA'
}

export function ThisWeekend({ events }: { events: Event[] }) {
  if (events.length === 0) return null

  return (
    <section className="pt-6 pb-4 mb-2 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="font-header text-xl font-bold text-white">📅 This Weekend</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x px-4">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group shrink-0 snap-start flex gap-3 items-center w-64 p-3 rounded-xl border border-border bg-surface hover:border-accent-primary/50 transition-all"
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
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
                {event.name}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {format(parseISO(event.event_date), 'EEE, MMM d · h:mm a')}
              </p>
              <p className="text-xs font-semibold text-accent-primary mt-0.5">{formatPrice(event)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
