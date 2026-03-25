"use client"

import Link from "next/link"
import { format, isToday, isTomorrow } from "date-fns"
import { Event } from "@/types/event"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

interface ComingUpSectionProps {
  events: Event[]
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEEE MMM d")
}

function groupByDay(events: Event[]): { dateKey: string; label: string; events: Event[] }[] {
  const map = new Map<string, Event[]>()

  for (const event of events) {
    const key = event.event_date.slice(0, 10) // YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  }

  return Array.from(map.entries()).map(([dateKey, evts]) => ({
    dateKey,
    label: getDayLabel(evts[0].event_date),
    events: evts.slice(0, 3),
  }))
}

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return "Free"
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return "Price TBA"
}

function MiniEventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="group flex gap-3 items-center p-3 rounded-xl border border-border bg-surface hover:border-accent-primary/50 transition-all">
      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-surface-elevated">
        <img
          src={getEventImage(event.flyer_image_url, event.category)}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_EVENT_IMAGE
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">
          {event.name}
        </h4>
        {event.venue_name && (
          <p className="text-xs text-[#7DD8E8] line-clamp-1">📍 {event.venue_name}</p>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-[#7DD8E8]">
            {format(new Date(event.event_date), "h:mm a")}
          </p>
          <p className="text-xs font-semibold text-accent-primary">{formatPrice(event)}</p>
        </div>
      </div>
    </Link>
  )
}

export function ComingUpSection({ events }: ComingUpSectionProps) {
  const days = groupByDay(events)

  if (days.length === 0) return null

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-text-primary">Coming Up</h2>
      <div className="space-y-6">
        {days.map(({ dateKey, label, events: dayEvents }) => (
          <div key={dateKey}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-[#7DD8E8]">{label}</h3>
              <Link
                href={`/events?date=${dateKey}`}
                className="text-xs text-accent-primary hover:underline font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {dayEvents.map((event) => (
                <MiniEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
