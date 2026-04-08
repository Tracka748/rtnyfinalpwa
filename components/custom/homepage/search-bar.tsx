"use client"

import { Search, X } from "lucide-react"
import { useState } from "react"

export function HomepageSearchBar() {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  return (
    <div className="sticky top-16 z-40 w-full border-b border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#707070] pointer-events-none z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search events, venues, artists…"
            className={`w-full rounded-full border-0 bg-[#1A1A1A] pl-12 font-sans text-base text-[#F9FDFF] placeholder:text-[#707070] outline-none transition-all duration-200 ${
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
        </div>
      </div>
    </div>
  )
}
