'use client'

import { useState, useEffect } from 'react'
import { AppNav } from '@/components/custom/layout/app-nav'
import { CategoryFilter } from '@/components/custom/events/category-filter'
import { EventCard } from '@/components/custom/events/event-card'
import type { EventCategory } from '@/types/database'

interface Event {
  id: string
  name: string
  description: string
  category: string
  event_date: string
  venue_id: string
  flyer_image_url: string | null
  ticket_prices: any
  total_tickets: number
  tickets_sold: number
  featured: boolean
  venue_name: string | null
  venue_address: string | null
  ticket_types: any[]
}

export default function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<EventCategory, number>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch category counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/v1/events/stats')
        const data = await res.json()
        if (data.success) {
          setCategoryCounts(data.counts)
        }
      } catch (err) {
        console.error('Error fetching category counts:', err)
      }
    }
    fetchCounts()
  }, [])

  // Fetch events with filters
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (selectedCategory) params.set('category', selectedCategory)
        if (searchQuery) params.set('q', searchQuery)

        const url = `/api/v1/events${params.toString() ? '?' + params.toString() : ''}`

        const res = await fetch(url)
        const data = await res.json()

        if (data.success) {
          setEvents(data.data || [])
        } else {
          throw new Error(data.error || 'Failed to fetch events')
        }
      } catch (err: any) {
        console.error('Error fetching events:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [selectedCategory, searchQuery])

  const handleClearFilters = () => {
    setSelectedCategory(null)
    setSearchQuery('')
  }

  return (
    <main className="min-h-screen bg-[#121113]">
      {/* App Navigation */}
      <AppNav />

      {/* Header */}
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121113] border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-7xl px-4 py-12 pt-24 sm:px-6 lg:px-8">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-5xl font-bold text-[#F9FDFF] md:text-6xl">
            Discover <span className="text-[#59FFA0]">Rochester</span>
          </h1>
          <p className="mt-4 font-[family-name:var(--font-rubik)] text-xl text-[#A0A0A0]">
            Find nightlife, dining, arts, sports, and family events
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Category Filter */}
        <CategoryFilter
          selected={selectedCategory}
          onChange={setSelectedCategory}
          counts={categoryCounts}
        />

        {/* Search Bar */}
        <div className="mt-8 mb-6">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search events by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-lg text-[#F9FDFF] placeholder-[#6A6A6A] focus:outline-none focus:border-[#59FFA0] transition-colors font-[family-name:var(--font-rubik)]"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">
              🔍
            </div>
          </div>
        </div>

        {/* Results Header */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
              {events.length} {events.length === 1 ? 'event' : 'events'}
              {selectedCategory && ` in ${selectedCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="text-[#59FFA0] hover:text-[#59FFA0]/80 text-sm font-medium font-[family-name:var(--font-rubik)]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[500px] bg-[#1A1A1A] animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 max-w-md mx-auto">
              <p className="font-[family-name:var(--font-rubik)] text-red-400">
                Error loading events: {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-[#59FFA0] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {events.map(event => (
              <EventCard key={event.id} event={event as any} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="font-[family-name:var(--font-rokkitt)] text-3xl font-bold text-[#F9FDFF] mb-3">
              No events found
            </h2>
            <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0] text-lg mb-6">
              {selectedCategory
                ? `No ${selectedCategory} events available right now`
                : searchQuery
                  ? `No events matching "${searchQuery}"`
                  : 'No events available right now'}
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-3 bg-[#59FFA0] text-[#121113] rounded-full font-semibold hover:bg-[#4DE08A] transition-colors font-[family-name:var(--font-rubik)]"
            >
              View all events
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
