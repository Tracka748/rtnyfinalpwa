"use client"

import type { Event } from "@/types/event"
import { EventCard } from "./event-card"
import { useSavedEvents } from "@/hooks/useSavedEvents"

interface EventGridProps {
  events: Event[]
  onEventClick?: (event: Event) => void
}

export function EventGrid({ events, onEventClick }: EventGridProps) {
  const { isSaved, toggleSave } = useSavedEvents()

  // Separate featured and regular events
  const featuredEvents = events.filter((event) => event.featured)
  const regularEvents = events.filter((event) => !event.featured)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Featured Section */}
      {featuredEvents.length > 0 && (
        <section className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="font-header text-3xl font-bold text-[#F9FDFF] md:text-4xl">
              Featured Events
            </h2>
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED]" />
          </div>

          {/* Featured Events Grid - Same layout as Upcoming Events */}
          <div className="grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick?.(event)}
                isSaved={isSaved(event.id)}
                onToggleSave={() => toggleSave(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Regular Events Grid */}
      {regularEvents.length > 0 && (
        <section className="py-12">
          <div className="mb-8 text-center">
            <h2 className="font-header text-3xl font-bold text-[#F9FDFF] md:text-4xl">
              Upcoming Events
            </h2>
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED]" />
          </div>

          {/* Responsive Grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regularEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick?.(event)}
                isSaved={isSaved(event.id)}
                onToggleSave={() => toggleSave(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="py-24 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1A1A]">
            <svg 
              className="h-10 w-10 text-[#59FFA0]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <p className="font-sans text-lg text-[#A0A0A0]">
            No events available at the moment.
          </p>
          <p className="mt-2 font-sans text-sm text-[#707070]">
            Check back soon for exciting new events!
          </p>
        </div>
      )}
    </div>
  )
}