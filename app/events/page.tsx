"use client"

import { useState, useMemo } from "react"
import { EventGrid } from "@/components/custom/events/event-grid"
import { SearchBar } from "@/components/custom/events/search-bar"
import { EventFilters, type DateFilter } from "@/components/custom/events/event-filters"
import { FilterChip } from "@/components/ui/filter-chip"
import type { Event } from "@/types/event"

const sampleEvents: Event[] = [
  {
    id: "1",
    name: "Saturday Night Fever",
    description: "Experience the best house and techno beats with DJ Apex",
    event_date: "2025-01-18T22:00:00Z",
    venue_name: "The Montage Music Hall",
    venue_address: "50 Chestnut St, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/59FFA0?text=Saturday+Night+Fever&font=roboto",
    min_price: 25,
    max_price: 45,
    category: "Electronic",
    featured: true,
    status: "active",
    tickets_available: 150,
  },
  {
    id: "2",
    name: "Jazz & Cocktails Night",
    description: "Smooth jazz with craft cocktails and tapas",
    event_date: "2025-01-20T20:00:00Z",
    venue_name: "Anthology",
    venue_address: "336 East Ave, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/1AC8ED?text=Jazz+%26+Cocktails&font=roboto",
    min_price: 35,
    max_price: 60,
    category: "Jazz",
    featured: false,
    status: "active",
    tickets_available: 80,
  },
  {
    id: "3",
    name: "Rooftop Summer Vibes",
    description: "Open-air party with panoramic city views",
    event_date: "2025-01-22T21:00:00Z",
    venue_name: "Skylark Lounge",
    venue_address: "4 Pl, Rochester, NY 14614",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/FFB84D?text=Rooftop+Vibes&font=roboto",
    min_price: 30,
    max_price: 50,
    category: "Party",
    featured: false,
    status: "active",
    tickets_available: 120,
  },
  {
    id: "4",
    name: "Comedy Night Live",
    description: "Stand-up comedy featuring local and touring comedians",
    event_date: "2025-01-24T19:30:00Z",
    venue_name: "Anthology",
    venue_address: "336 East Ave, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/FF6B9D?text=Comedy+Night&font=roboto",
    min_price: 15,
    max_price: 35,
    category: "Comedy",
    featured: false,
    status: "active",
    tickets_available: 95,
  },
  {
    id: "5",
    name: "Hip-Hop Takeover",
    description: "The hottest hip-hop tracks all night long",
    event_date: "2025-01-25T22:00:00Z",
    venue_name: "The Montage Music Hall",
    venue_address: "50 Chestnut St, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/9D4EDD?text=Hip-Hop+Takeover&font=roboto",
    min_price: 20,
    max_price: 40,
    category: "Hip-Hop",
    featured: true,
    status: "active",
    tickets_available: 200,
  },
  {
    id: "6",
    name: "Latin Nights",
    description: "Salsa, bachata, and reggaeton with live DJ",
    event_date: "2025-01-27T21:00:00Z",
    venue_name: "Skylark Lounge",
    venue_address: "4 Pl, Rochester, NY 14614",
    flyer_image_url: "https://placehold.co/800x1000/1a1a1a/FF006E?text=Latin+Nights&font=roboto",
    min_price: 25,
    max_price: 45,
    category: "Latin",
    featured: false,
    status: "active",
    tickets_available: 110,
  },
]

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDate, setSelectedDate] = useState<DateFilter>("all")

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(sampleEvents.map((e) => e.category))).sort()
  }, [])

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    let filtered = sampleEvents

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
  }, [searchQuery, selectedCategory, selectedDate])

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
  }

  return (
    <main className="min-h-screen bg-[#121113]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121113] pb-8 pt-16 text-center">
        <h1 className="font-header text-5xl font-bold text-[#F9FDFF] md:text-6xl">
          Upcoming Events
        </h1>
        <p className="mt-4 font-sans text-lg text-[#A0A0A0]">
          Rochester's hottest nightlife events
        </p>
      </div>

      {/* Search and Filters Container */}
      <div className="sticky top-0 z-10 border-b border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
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
                <span className="font-sans text-sm text-[#A0A0A0]">
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
                  className="font-sans text-sm text-[#59FFA0] underline-offset-2 transition-all hover:underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="font-sans text-sm text-[#A0A0A0]">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Event Grid */}
      <EventGrid events={filteredEvents} onEventClick={handleEventClick} />
    </main>
  )
}