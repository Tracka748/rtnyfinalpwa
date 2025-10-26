"use client"

import { useState, useMemo, useEffect } from "react"
import { AppNav } from "@/components/custom/layout/app-nav"
import { EventGrid } from "@/components/custom/events/event-grid"
import { SearchBar } from "@/components/custom/events/search-bar"
import { EventFilters, type DateFilter } from "@/components/custom/events/event-filters"
import { FilterChip } from "@/components/ui/filter-chip"
import type { Event } from "@/types/event"

export default function EventsPage() {
  // State for events data
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDate, setSelectedDate] = useState<DateFilter>("all")

  // Fetch events from API
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const response = await fetch('/api/v1/events')
        
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setEvents(result.data)
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (err: any) {
        console.error('Error fetching events:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, []) // Empty dependency array = fetch once on mount

  // Extract unique categories from real data
  const categories = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.category))).sort()
  }, [events])

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Search filter (name or venue)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          event.venue_name.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((event) => event.category === selectedCategory)
    }

    // Date filter
    if (selectedDate !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date)
        
        switch (selectedDate) {
          case "today":
            return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
          case "this-week":
            const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return eventDate >= today && eventDate < weekEnd
          case "this-month":
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            return eventDate >= today && eventDate <= monthEnd
          default:
            return true
        }
      })
    }

    return filtered
  }, [events, searchQuery, selectedCategory, selectedDate])

  // Clear all filters
  const handleClearAll = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedDate("all")
  }

  // Count active filters
  const activeFilterCount = [
    searchQuery !== "",
    selectedCategory !== "all",
    selectedDate !== "all",
  ].filter(Boolean).length

  const handleEventClick = (event: Event) => {
    console.log("Event clicked:", event.name)
    // TODO: Navigate to event detail page
    // router.push(`/events/${event.id}`)
  }

  return (
    <main className="min-h-screen bg-[#121113]">
      {/* App Navigation */}
      <AppNav />

      {/* Header */}
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121113] pb-8 pt-24 text-center">
        <h1 className="font-[family-name:var(--font-rokkitt)] text-5xl font-bold text-[#F9FDFF] md:text-6xl">
          Upcoming Events
        </h1>
        <p className="mt-4 font-[family-name:var(--font-rubik)] text-lg text-[#A0A0A0]">
          Rochester's hottest nightlife events
        </p>
      </div>

      {/* Search and Filters Container */}
      <div className="sticky top-16 z-10 border-b border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex justify-center">
              <SearchBar onSearch={setSearchQuery} />
            </div>

            {/* Filters */}
            <EventFilters
              selectedCategory={selectedCategory}
              selectedDate={selectedDate}
              onCategoryChange={setSelectedCategory}
              onDateChange={setSelectedDate}
              categories={categories}
            />

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active:
                </span>

                {searchQuery && (
                  <FilterChip
                    label="Search"
                    value={searchQuery}
                    onRemove={() => setSearchQuery("")}
                  />
                )}

                {selectedCategory !== "all" && (
                  <FilterChip
                    label="Category"
                    value={selectedCategory}
                    onRemove={() => setSelectedCategory("all")}
                  />
                )}

                {selectedDate !== "all" && (
                  <FilterChip
                    label="Date"
                    value={
                      selectedDate === "today"
                        ? "Today"
                        : selectedDate === "this-week"
                        ? "This Week"
                        : "This Month"
                    }
                    onRemove={() => setSelectedDate("all")}
                  />
                )}

                <button
                  onClick={handleClearAll}
                  className="font-[family-name:var(--font-rubik)] text-sm text-[#59FFA0] underline-offset-2 transition-all hover:underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#59FFA0] border-r-transparent"></div>
          <p className="mt-4 font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
            Loading events...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
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

      {/* Results Count */}
      {!loading && !error && (
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
          </p>
        </div>
      )}

      {/* Event Grid */}
      {!loading && !error && (
        <EventGrid events={filteredEvents} onEventClick={handleEventClick} />
      )}

      {/* Empty State */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-rubik)] text-lg text-[#A0A0A0]">
            No events found matching your criteria
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAll}
              className="mt-4 rounded-lg bg-[#59FFA0] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </main>
  )
}