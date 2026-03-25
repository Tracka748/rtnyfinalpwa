'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  addDays,
  format,
  startOfDay,
} from 'date-fns'
import { Event } from '@/types/event'
import { DateHeader } from '@/components/custom/events/date-header'
import { FeaturedStrip } from '@/components/custom/events/featured-strip'
import { HappeningNow } from '@/components/custom/events/happening-now'
import { TonightSection } from '@/components/custom/events/tonight-section'
import { TimelineSection } from '@/components/custom/events/timeline-section'
import { MoreInCategory } from '@/components/custom/events/more-in-category'
import { ThisWeekend } from '@/components/custom/events/this-weekend'
import { CategoryGrid } from '@/components/custom/homepage/category-grid'
import { getEventImage } from '@/lib/image-utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'Today', icon: '📅' },
  { value: 'all-dates', label: 'All Dates', icon: '📆' },
  { value: 'nightlife', label: 'Nightlife', icon: '🎉' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'music', label: 'Music', icon: '🎸' },
  { value: 'movies', label: 'Movies', icon: '🎬' },
  { value: 'dining', label: 'Dining', icon: '🍽️' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'arts', label: 'Arts', icon: '🎨' },
]

// ─── Main Content ─────────────────────────────────────────────────────────────

function EventsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const todayStr = new Date().toISOString().slice(0, 10)
  const selectedDate = searchParams.get('date') || todayStr
  const selectedCategory = searchParams.get('category') || 'all'
  const isAllDates = selectedCategory === 'all-dates'

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  // All events for the selected date (unfiltered — filtering done client-side)
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [allDatesEvents, setAllDatesEvents] = useState<Event[]>([])
  const [selectedMonth, setSelectedMonth] = useState('Mar')
  const [loading, setLoading] = useState(true)

  // Normalise raw API event: pick price from ticket_types when min_price is absent
  function normalizeEvent(e: any): Event {
    const ticketPrice = e.ticket_types?.[0]?.price ?? null
    return {
      ...e,
      min_price: e.min_price ?? ticketPrice,
      flyer_image_url: getEventImage(e.flyer_image_url || e.image_url, e.category),
    }
  }

  // Fetch events for the selected date (no category/search filter — done client-side)
  useEffect(() => {
    if (isAllDates) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/v1/events?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setTodayEvents((d.data || d.events || []).map(normalizeEvent)))
      .finally(() => setLoading(false))
  }, [selectedDate, isAllDates])

  // Fetch all events when "All Dates" is selected
  useEffect(() => {
    if (!isAllDates) return

    fetch('/api/v1/events')
      .then((res) => res.json())
      .then((data) => {
        const events: Event[] = (data.data || data.events || []).map(normalizeEvent)
        const now = new Date()
        const todayStart = startOfDay(now)
        setAllDatesEvents(
          events.filter((e) => {
            const dt = new Date(e.event_date)
            return !isNaN(dt.getTime()) && dt >= todayStart
          })
        )
      })
      .catch(() => setAllDatesEvents([]))
  }, [isAllDates])

  // Fetch all upcoming events (next 30 days) — for featured / happening now
  useEffect(() => {
    fetch('/api/v1/events')
      .then((r) => r.json())
      .then((d) => {
        const events: Event[] = (d.data || d.events || []).map(normalizeEvent)
        const now = new Date()
        const todayStart = startOfDay(now)
        const cutoff = addDays(now, 30)
        setAllEvents(events.filter((e) => {
          const dt = new Date(e.event_date)
          return !isNaN(dt.getTime()) && dt >= todayStart && dt <= cutoff
        }))
      })
      .catch(console.error)
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const now = new Date()

  const featuredEvents = allEvents.filter((e) => e.featured === true)

  const happeningNow = allEvents.filter((e) => {
    const start = new Date(e.event_date)
    const twoHoursAfter = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    return start <= now && now <= twoHoursAfter
  })

  const isToday = selectedDate === todayStr

  const tonightEvents = todayEvents.filter(
    (e) => new Date(e.event_date).getHours() >= 17
  )

  // Client-side filtered events for the timeline
  const filteredEvents = todayEvents.filter((e) => {
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory
    const matchesSearch =
      !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const monthFilteredEvents = allDatesEvents.filter((e) => {
    const month = format(new Date(e.event_date), 'MMM')
    return month === selectedMonth
  })
  const half = Math.ceil(monthFilteredEvents.length / 2)
  const row1Events = monthFilteredEvents.slice(0, half).slice(0, 5)
  const row2Events = monthFilteredEvents.slice(half).slice(0, 5)

  const recommendedEvents =
    selectedCategory !== 'all' && selectedCategory !== 'all-dates'
      ? allEvents
          .filter(
            (e) =>
              e.category === selectedCategory &&
              e.event_date.slice(0, 10) !== selectedDate
          )
          .slice(0, 6)
      : []

  const weekendEvents = allEvents.filter((e) => {
    const day = new Date(e.event_date).getDay()
    const eventDate = e.event_date.split('T')[0]
    return (day === 0 || day === 6) && eventDate !== selectedDate
  })

  // ── URL helpers ──────────────────────────────────────────────────────────────

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      p.set(key, value)
    } else {
      p.delete(key)
    }
    router.push(`/events?${p}`, { scroll: false })
  }

  function handleSearch(value: string) {
    setSearchQuery(value)
  }

  function handleCategoryChange(category: string) {
    setParam('category', category)
  }

  const ExploreMore = CategoryGrid

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#121113] pb-20">

      {/* 1. Date Header + Weather */}
      <DateHeader selectedDate={selectedDate} eventCount={todayEvents.length} isAllDates={isAllDates} />

      {/* 3. Search + Category Tabs — sticky */}
      <div className="sticky top-0 z-50 bg-[#121113]/95 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-[1200px] px-4 py-3 space-y-3">

          {/* Search */}
          <div className="relative max-w-[480px]">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-full focus:outline-none focus:border-accent-primary transition-colors text-text-primary placeholder:text-[#7DD8E8]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7DD8E8] text-sm">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7DD8E8] hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.value
              return (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`shrink-0 snap-start flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-accent-primary text-background'
                      : 'bg-surface text-[#7DD8E8] border border-border hover:border-accent-primary/50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {isAllDates && (
        <div className="pb-20">

          {/* ⭐ FEATURED EVENTS - SIZE 1 */}
          {featuredEvents.length > 0 && (
            <section className="py-8">
              <div className="flex items-center justify-between px-4 mb-5">
                <h2 className="font-header text-xl font-bold text-white">⭐ Featured Events</h2>
                <button className="text-[#1AC8ED] text-sm hover:underline">View All →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', flexWrap: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                {featuredEvents.slice(0, 6).map(event => (
                  <div
                    key={event.id}
                    style={{ minWidth: '300px', maxWidth: '300px', flexShrink: 0 }}
                    className="rounded-2xl overflow-hidden bg-[#1a1a1c] border border-white/10 hover:border-[#59FFA0]/40 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
                  >
                    <img
                      src={getEventImage(event.flyer_image_url, event.category)}
                      alt={event.name}
                      className="w-full h-[200px] object-cover"
                    />
                    <div className="p-5">
                      <p className="font-label text-xs text-[#59FFA0] uppercase tracking-widest mb-2">
                        {event.category}
                      </p>
                      <h3 className="font-slab-serif font-bold text-white text-xl line-clamp-2 mb-2">
                        {event.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-[#7DD8E8] text-xs truncate">
                          📍 {event.venue_name || 'TBA'}
                        </p>
                        <span className="font-serif text-[#59FFA0] font-bold text-sm ml-2">
                          {event.min_price ? `$${event.min_price}` : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ minWidth: '120px', maxWidth: '120px', flexShrink: 0, height: '285px' }} className="rounded-2xl bg-white/5 border border-white/10 hover:border-[#59FFA0]/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-4">
                  <span className="text-3xl text-[#7DD8E8]">→</span>
                  <span className="font-label text-xs text-[#59FFA0] uppercase tracking-widest text-center">View All</span>
                </div>
              </div>
            </section>
          )}

          <div className="h-[1px] bg-white/10 mx-4" />

          {/* 📅 ALL EVENTS - SIZE 2 */}
          <section style={{ overflowX: 'hidden' }} className="py-8">
            <div className="flex items-center gap-4 px-4 mb-5">
              <h2 className="font-header text-xl font-bold text-white shrink-0">📅 All Events</h2>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      selectedMonth === month
                        ? 'bg-[#59FFA0] text-black'
                        : 'bg-white/5 text-[#7DD8E8] border border-white/10 hover:border-[#59FFA0]/30'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 1 */}
            <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', flexWrap: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {row1Events.map(event => (
                <div
                  key={event.id}
                  style={{ minWidth: '220px', maxWidth: '220px', flexShrink: 0 }}
                  className="rounded-2xl overflow-hidden bg-[#1a1a1c] border border-white/10 hover:border-[#59FFA0]/40 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={getEventImage(event.flyer_image_url, event.category)}
                    alt={event.name}
                    className="w-full h-[150px] object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-label text-xs text-[#59FFA0] uppercase tracking-widest">
                        {event.category}
                      </p>
                      <span className="text-xs text-[#1AC8ED] font-bold">
                        {format(new Date(event.event_date), 'MMM d')}
                      </span>
                    </div>
                    <h3 className="font-slab-serif font-bold text-white text-base line-clamp-2 mb-2">
                      {event.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-[#7DD8E8] text-xs truncate">
                        📍 {event.venue_name || 'TBA'}
                      </p>
                      <span className="font-serif text-[#59FFA0] font-bold text-sm ml-2">
                        {event.min_price ? `$${event.min_price}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', flexWrap: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {row2Events.map(event => (
                <div
                  key={event.id}
                  style={{ minWidth: '220px', maxWidth: '220px', flexShrink: 0 }}
                  className="rounded-2xl overflow-hidden bg-[#1a1a1c] border border-white/10 hover:border-[#59FFA0]/40 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={getEventImage(event.flyer_image_url, event.category)}
                    alt={event.name}
                    className="w-full h-[150px] object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-label text-xs text-[#59FFA0] uppercase tracking-widest">
                        {event.category}
                      </p>
                      <span className="text-xs text-[#1AC8ED] font-bold">
                        {format(new Date(event.event_date), 'MMM d')}
                      </span>
                    </div>
                    <h3 className="font-slab-serif font-bold text-white text-base line-clamp-2 mb-2">
                      {event.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-[#7DD8E8] text-xs truncate">
                        📍 {event.venue_name || 'TBA'}
                      </p>
                      <span className="font-serif text-[#59FFA0] font-bold text-sm ml-2">
                        {event.min_price ? `$${event.min_price}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All button - full width, bottom of section */}
            <div className="px-4 mt-6">
              <button className="w-full py-4 rounded-2xl border border-white/10 hover:border-[#59FFA0]/40 bg-white/5 hover:bg-white/[0.07] text-white font-header font-bold text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-2">
                <span>View All Events in {selectedMonth}</span>
                <span className="text-[#59FFA0]">→</span>
              </button>
            </div>
          </section>

          <div className="h-[1px] bg-white/10 mx-4" />

          {/* 🎯 EVENTS FOR YOU - SIZE 3 */}
          <section className="py-8">
            <div className="flex items-center justify-between px-4 mb-5">
              <h2 className="font-header text-xl font-bold text-white">🎯 Events For You</h2>
              <button className="text-[#1AC8ED] text-sm hover:underline">View All →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', flexWrap: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {allDatesEvents.slice(0, 6).map(event => (
                <div
                  key={`rec-${event.id}`}
                  style={{ minWidth: '180px', maxWidth: '180px', flexShrink: 0 }}
                  className="rounded-2xl overflow-hidden bg-[#1a1a1c] border border-white/10 hover:border-[#59FFA0]/40 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={getEventImage(event.flyer_image_url, event.category)}
                    alt={event.name}
                    className="w-full h-[120px] object-cover"
                  />
                  <div className="p-3">
                    <h3 className="font-slab-serif font-bold text-white text-sm line-clamp-2 mb-1">
                      {event.name}
                    </h3>
                    <p className="font-label text-xs text-[#59FFA0] uppercase tracking-widest">
                      {event.category}
                    </p>
                    <p className="text-[#1AC8ED] text-xs font-bold mt-0.5">
                      {format(new Date(event.event_date), 'MMM d')}
                    </p>
                  </div>
                </div>
              ))}
              <div style={{ minWidth: '120px', maxWidth: '120px', flexShrink: 0, height: '192px' }} className="rounded-2xl bg-white/5 border border-white/10 hover:border-[#59FFA0]/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-4">
                <span className="text-3xl text-[#7DD8E8]">→</span>
                <span className="font-label text-xs text-[#59FFA0] uppercase tracking-widest text-center">View All</span>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-white/10 mx-4" />

          {/* ⏳ COMING UP SOON - SIZE 4 */}
          <section className="py-8">
            <div className="flex items-center justify-between px-4 mb-5">
              <h2 className="font-header text-xl font-bold text-white">⏳ Coming Up Soon</h2>
              <button className="text-[#1AC8ED] text-sm hover:underline">View All →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '12px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', flexWrap: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {allDatesEvents.slice(0, 5).map(event => (
                <div
                  key={`upcoming-${event.id}`}
                  style={{ minWidth: '150px', maxWidth: '150px', flexShrink: 0 }}
                  className="rounded-2xl overflow-hidden bg-[#1a1a1c] border border-white/10 hover:border-[#59FFA0]/40 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={getEventImage(event.flyer_image_url, event.category)}
                    alt={event.name}
                    className="w-full h-[100px] object-cover"
                  />
                  <div className="p-3">
                    <span className="inline-block text-xs text-[#1AC8ED] font-bold bg-[#1AC8ED]/10 px-2 py-0.5 rounded-full mb-2">
                      {format(new Date(event.event_date), 'EEE h:mm a')}
                    </span>
                    <h3 className="font-slab-serif font-bold text-white text-xs line-clamp-2">
                      {event.name}
                    </h3>
                  </div>
                </div>
              ))}
              <div style={{ minWidth: '120px', maxWidth: '120px', flexShrink: 0, height: '168px' }} className="rounded-2xl bg-white/5 border border-white/10 hover:border-[#59FFA0]/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-4">
                <span className="text-3xl text-[#7DD8E8]">→</span>
                <span className="font-label text-xs text-[#59FFA0] uppercase tracking-widest text-center">View All</span>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-white/10 mx-4" />

          {/* Explore More always at bottom */}
          <ExploreMore />

        </div>
      )}

      {!isAllDates && (
        <>
          {/* 4. Featured Events — conditional */}
          {featuredEvents.length > 0 && (
            <>
              <div className="h-2 bg-[#0a0a0b]" />
              <FeaturedStrip events={featuredEvents} />
            </>
          )}

          {/* 5. Happening Now — conditional */}
          {happeningNow.length > 0 && (
            <>
              <div className="h-2 bg-[#0a0a0b]" />
              <HappeningNow events={happeningNow} />
            </>
          )}

          {/* 6. Tonight — conditional */}
          {isToday && tonightEvents.length > 0 && (
            <>
              <div className="h-2 bg-[#0a0a0b]" />
              <TonightSection events={tonightEvents} />
            </>
          )}

          {/* 7. Hourly Timeline */}
          <div className="h-2 bg-[#0a0a0b]" />
          {loading ? (
            <section className="bg-white/[0.02] rounded-2xl mx-4 py-6 mb-6">
              <h2 className="font-header text-xl font-bold text-white mb-6 px-4">🕐 Timeline</h2>
              <div className="px-4 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex flex-col items-center w-4 pt-0.5">
                      <div className="w-3 h-3 rounded-full bg-surface-elevated animate-pulse" />
                      <div className="w-px flex-1 mt-1.5 bg-border/30" />
                    </div>
                    <div className="flex-1 pb-8 space-y-2">
                      <div className="h-4 w-20 bg-surface-elevated rounded animate-pulse" />
                      <div className="h-20 bg-surface-elevated rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <TimelineSection
              events={filteredEvents}
              selectedDate={selectedDate}
              selectedCategory={selectedCategory}
            />
          )}

          {/* 8. More in Category — conditional */}
          {selectedCategory !== 'all' && selectedCategory !== 'all-dates' && recommendedEvents.length > 0 && (
            <>
              <div className="h-2 bg-[#0a0a0b]" />
              <MoreInCategory category={selectedCategory} events={recommendedEvents} />
            </>
          )}

          {/* 9. This Weekend — conditional */}
          {weekendEvents.length > 0 && (
            <>
              <div className="h-2 bg-[#0a0a0b]" />
              <ThisWeekend events={weekendEvents} />
            </>
          )}

          {/* 10. Explore More — always renders */}
          <div className="h-2 bg-[#0a0a0b]" />
          <CategoryGrid />
        </>
      )}

    </div>
  )
}

// ─── Page (Suspense boundary for useSearchParams) ─────────────────────────────

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#121113]">
          <div className="text-[#7DD8E8]">Loading events…</div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  )
}
