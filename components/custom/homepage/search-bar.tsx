"use client"

import { Search, X, Calendar, MapPin, Music } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/database"

type EventResult = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "name" | "category" | "event_date" | "flyer_image_url"
>
type VenueResult = Pick<
  Database["public"]["Tables"]["venues"]["Row"],
  "id" | "name" | "address"
>
type ArtistResult = Pick<
  Database["public"]["Tables"]["artists"]["Row"],
  "id" | "name" | "genre" | "photo_url" | "slug"
>

interface SearchResults {
  events: EventResult[]
  venues: VenueResult[]
  artists: ArtistResult[]
}

export function HomepageSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<SearchResults>({ events: [], venues: [], artists: [] })
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults({ events: [], venues: [], artists: [] })
      setShowDropdown(false)
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (json.success) {
          setResults(json.data)
          setShowDropdown(true)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const hasResults =
    results.events.length > 0 || results.venues.length > 0 || results.artists.length > 0

  function handleSelect(path: string) {
    router.push(path)
    setShowDropdown(false)
    setQuery("")
  }

  return (
    <div className="sticky top-16 z-40 w-full border-b border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        <div className="relative" ref={containerRef}>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1ac8ed] pointer-events-none z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              setTimeout(() => setShowDropdown(false), 150)
            }}
            placeholder="Search events, venues, artists…"
            className={`w-full rounded-full border-0 bg-[#1A1A1A] pl-12 font-sans text-base text-[#F9FDFF] placeholder:text-[#FFFFFF] outline-none transition-all duration-200 ${
              query ? "pr-12" : "pr-4"
            } ${
              focused
                ? "h-14 shadow-[0_0_0_2px_#59FFA0] bg-[#1E1E1E]"
                : "h-12 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[#2A2A2A] p-1.5 transition-all hover:bg-[#3A3A3A] active:scale-95"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-[#F9FDFF]" />
            </button>
          )}

          {showDropdown && (loading || hasResults) && (
            <div className="absolute top-full mt-2 w-full z-50 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
              {loading ? (
                <p className="px-4 py-3 text-center text-xs text-[#7A7978]">Searching…</p>
              ) : (
                <>
                  {results.events.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 font-[Montserrat] text-xs uppercase tracking-wider text-[#7A7978]">
                        Events
                      </p>
                      {results.events.map((event) => (
                        <button
                          key={event.id}
                          onMouseDown={() => handleSelect(`/events/${event.id}`)}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 hover:bg-[#242424] cursor-pointer"
                        >
                          <Calendar className="h-4 w-4 shrink-0 text-[#59FFA0]" />
                          <span className="text-sm font-sans text-[#F9FDFF]">{event.name}</span>
                          {event.category && (
                            <span className="text-xs text-[#7A7978]">{event.category}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {results.venues.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 font-[Montserrat] text-xs uppercase tracking-wider text-[#7A7978]">
                        Venues
                      </p>
                      {results.venues.map((venue) => (
                        <button
                          key={venue.id}
                          onMouseDown={() => handleSelect(`/events?venue=${venue.id}`)}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 hover:bg-[#242424] cursor-pointer"
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-[#1AC8ED]" />
                          <div className="flex flex-col">
                            <span className="text-sm font-sans text-[#F9FDFF]">{venue.name}</span>
                            {venue.address && (
                              <span className="text-xs text-[#7A7978] mt-0.5">{venue.address}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.artists.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 font-[Montserrat] text-xs uppercase tracking-wider text-[#7A7978]">
                        Artists
                      </p>
                      {results.artists.map((artist) => (
                        <button
                          key={artist.id}
                          onMouseDown={() => handleSelect(`/events?artist=${artist.id}`)}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 hover:bg-[#242424] cursor-pointer"
                        >
                          <Music className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                          <span className="text-sm font-sans text-[#F9FDFF]">{artist.name}</span>
                          {artist.genre && (
                            <span className="text-xs text-[#7A7978]">{artist.genre}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
