"use client"

import { Search, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchBar({ 
  onSearch, 
  placeholder = "Search events or venues...",
  debounceMs = 300 
}: SearchBarProps) {
  const [query, setQuery] = useState("")

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, onSearch, debounceMs])

  const handleClear = useCallback(() => {
    setQuery("")
    onSearch("")
  }, [onSearch])

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A0A0A0]" />
        
        {/* Input */}
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl border-0 bg-[#1A1A1A] pl-12 pr-12 font-sans text-base text-[#F9FDFF] placeholder:text-[#707070] focus-visible:ring-2 focus-visible:ring-[#59FFA0] focus-visible:ring-offset-0"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[#2A2A2A] p-1.5 transition-all hover:bg-[#3A3A3A] active:scale-95"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-[#F9FDFF]" />
          </button>
        )}
      </div>

      {/* Search hint text */}
      {query && (
        <p className="mt-2 font-sans text-sm text-[#707070]">
          Searching for "{query}"...
        </p>
      )}
    </div>
  )
}