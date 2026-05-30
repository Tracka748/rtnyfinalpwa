'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { label: 'Nightlife', emoji: '🎉', value: 'nightlife' },
  { label: 'Music',     emoji: '🎸', value: 'music' },
  { label: 'Dining',    emoji: '🍹', value: 'dining' },
  { label: 'Arts',      emoji: '🎨', value: 'arts' },
  { label: 'Sports',    emoji: '🏃', value: 'sports' },
  { label: 'Family',    emoji: '👥', value: 'family' },
  { label: 'Movies',    emoji: '🎬', value: 'movies' },
  { label: 'Events',    emoji: '✨', value: 'festivals' },
  { label: 'Perks',     emoji: '🎟️', value: 'perks' },
]

export function ExploreCategoriesGrid() {
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/events/category-counts')
      .then((r) => r.json())
      .then((d) => setCounts(d.data ?? {}))
      .catch(() => setCounts({}))
      .finally(() => setLoading(false))
  }, [])

  function handleClick(value: string) {
    if (value === 'perks') {
      router.push('/perks')
    } else {
      router.push(`/events?category=${value}`)
    }
  }

  return (
    <div className="bg-white/[0.02] rounded-2xl mx-4 px-4 py-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-header text-xl font-bold text-white">🧭 Explore More</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.value]
          const countLabel = loading ? '—' : count !== undefined ? `${count} tonight` : '0 tonight'
          return (
            <div
              key={cat.value}
              onClick={() => handleClick(cat.value)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#1C1A1E] p-4 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-label text-xs font-semibold text-[#F9FDFF]">{cat.label}</span>
              <span className="font-sans text-[10px] text-[#59FFA0]">{countLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
