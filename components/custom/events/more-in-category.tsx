'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Event } from '@/types/event'
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils'

const CATEGORY_LABELS: Record<string, string> = {
  nightlife: 'Nightlife',
  family: 'Family',
  music: 'Music',
  movies: 'Movies',
  dining: 'Dining',
  sports: 'Sports',
  arts: 'Arts',
}

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return 'Free'
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return 'Price TBA'
}

interface MoreInCategoryProps {
  category: string
  events: Event[]
}

export function MoreInCategory({ category, events }: MoreInCategoryProps) {
  if (events.length === 0) return null

  const label = CATEGORY_LABELS[category] ?? category

  return (
    <section className="pt-6 pb-6 mb-2 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="font-header text-xl font-bold text-white">More in {label}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group rounded-xl overflow-hidden border border-border bg-surface hover:border-accent-primary/50 transition-all"
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
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
            </div>
            <div className="p-2.5">
              <p className="font-bold text-xs text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
                {event.name}
              </p>
              <p className="text-[10px] text-[#7DD8E8] mt-0.5">
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
