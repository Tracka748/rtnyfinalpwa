"use client"

import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Event } from "@/types/event"
import { DEFAULT_EVENT_IMAGE, getEventImage } from "@/lib/image-utils"

interface TimelineSectionProps {
  events: Event[]
  selectedDate: string
  selectedCategory?: string
}

function formatPrice(event: Event): string {
  if (event.min_price === 0 && (!event.max_price || event.max_price === 0)) return "Free"
  if (event.min_price) return `From $${event.min_price.toFixed(2)}`
  return "Price TBA"
}

function isHappeningNow(event: Event): boolean {
  const now = new Date()
  const start = new Date(event.event_date)
  const twoHoursAfter = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return start <= now && now <= twoHoursAfter
}

export function TimelineSection({ events, selectedDate, selectedCategory }: TimelineSectionProps) {
  const sectionTitle = selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'all-dates'
    ? `Timeline · ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`
    : 'Timeline'

  // Sort by time, then alphabetically for same-time events
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  // Group into time buckets so the spine can draw one dot per time slot
  const timeGroups: { time: string; eventDate: Date; events: Event[] }[] = []
  for (const event of sorted) {
    const time = format(new Date(event.event_date), 'h:mm a')
    const last = timeGroups[timeGroups.length - 1]
    if (last && last.time === time) {
      last.events.push(event)
    } else {
      timeGroups.push({ time, eventDate: new Date(event.event_date), events: [event] })
    }
  }

  const now = new Date()

  return (
    <section className="bg-white/[0.02] rounded-2xl mx-4 py-6 mb-6">
      <div className="flex items-center justify-between mb-6 px-4">
        <h2 className="font-header text-xl font-bold text-white">🕐 {sectionTitle}</h2>
      </div>

      {timeGroups.length === 0 ? (
        <div className="px-4 py-12 text-center border border-white/5 rounded-2xl mx-4">
          <p className="text-4xl mb-3">🗓️</p>
          <h3 className="font-header text-lg text-white mb-2">
            Nothing scheduled for {format(parseISO(selectedDate), 'MMMM d')}
          </h3>
          <p className="text-text-secondary text-sm">
            Check Featured Events above or explore what&apos;s coming up below
          </p>
        </div>
      ) : (
        <div className="px-4">
          {timeGroups.map(({ time, eventDate, events: groupEvents }, groupIndex) => {
            const isLast = groupIndex === timeGroups.length - 1
            const groupHour = eventDate.getHours()
            const isNow = groupHour === now.getHours()
            const isPast = groupHour < now.getHours()

            return (
              <div key={time} className="flex gap-4">
                {/* Spine */}
                <div className="flex flex-col items-center w-3 shrink-0 pt-[3px]">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                      isNow
                        ? 'bg-[#59FFA0] shadow-[0_0_8px_#59FFA0]'
                        : isPast
                        ? 'bg-white/20'
                        : 'bg-accent-primary'
                    }`}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 mt-1 bg-gradient-to-b from-white/15 to-white/5" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? 'pb-2' : 'pb-7'}`}>
                  {/* Time header */}
                  <div className="flex items-center gap-3 mt-8 mb-3">
                    <span
                      className={`font-label text-base font-bold uppercase tracking-wider ${
                        isNow ? 'text-[#59FFA0]' : isPast ? 'text-text-muted' : 'text-white'
                      }`}
                    >
                      {time}
                    </span>
                    {isNow && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30 animate-pulse tracking-wider">
                        NOW
                      </span>
                    )}
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Event cards */}
                  <div className="space-y-2">
                    {groupEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="group flex gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer mb-3"
                      >
                        <img
                          src={getEventImage(event.flyer_image_url, event.category)}
                          alt={event.name}
                          className="w-28 h-28 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => { e.currentTarget.src = DEFAULT_EVENT_IMAGE }}
                        />
                        <div className="flex-1 min-w-0 py-1 flex flex-col gap-1">
                          {/* Title — movie title energy */}
                          <h3 className="font-slab-serif font-black text-white text-xl leading-tight line-clamp-2">
                            {event.name}
                          </h3>

                          {/* Logline — one‑sentence vibe */}
                          {event.description && (
                            <p className="text-white/55 text-xs leading-snug line-clamp-2 italic">
                              {event.description}
                            </p>
                          )}

                          {/* Showtime phrase */}
                          <p className="text-white/40 text-xs font-medium">
                            {isHappeningNow(event)
                              ? 'Happening Now'
                              : `Happening ${format(new Date(event.event_date), 'h:mm a')}`}
                          </p>

                          {/* Genre tag + price row */}
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <span className="font-label text-[10px] font-black text-black bg-[#59FFA0] px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                              {event.category}
                            </span>
                            <span className="font-header text-[#59FFA0] text-sm font-black tracking-wide">
                              {formatPrice(event)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
