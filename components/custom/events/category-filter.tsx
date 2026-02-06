// components/custom/events/category-filter.tsx
'use client'

import { EventCategory } from '@/types/database'
import { cn } from '@/lib/utils'

const CATEGORIES: {
  value: EventCategory
  label: string
  icon: string
  description: string
  gradient: string
}[] = [
  {
    value: 'nightlife',
    label: 'Nightlife',
    icon: '🎉',
    description: 'Bars, clubs, and late-night events',
    gradient: 'from-purple-500/20 to-pink-500/20'
  },
  {
    value: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Kid-friendly activities and events',
    gradient: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    value: 'movies',
    label: 'Movies',
    icon: '🎬',
    description: 'Films, screenings, and cinema events',
    gradient: 'from-red-500/20 to-orange-500/20'
  },
  {
    value: 'dining',
    label: 'Dining',
    icon: '🍽️',
    description: 'Restaurant events and food experiences',
    gradient: 'from-orange-500/20 to-yellow-500/20'
  },
  {
    value: 'arts',
    label: 'Arts',
    icon: '🎨',
    description: 'Galleries, theater, and performances',
    gradient: 'from-pink-500/20 to-purple-500/20'
  },
  {
    value: 'sports',
    label: 'Sports',
    icon: '⚽',
    description: 'Games, tournaments, and athletic events',
    gradient: 'from-green-500/20 to-emerald-500/20'
  },
]

interface CategoryFilterProps {
  selected: EventCategory | null
  onChange: (category: EventCategory | null) => void
  counts?: Record<EventCategory, number>
}

export function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="space-y-6">
      {/* Mobile: Horizontal scroll with snap */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:hidden scrollbar-hide snap-x snap-mandatory scroll-smooth">
        <button
          onClick={() => onChange(null)}
          className={cn(
            "shrink-0 snap-start px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all flex items-center gap-2 font-[family-name:var(--font-rubik)]",
            !selected
              ? "bg-[#59FFA0] text-[#121113] shadow-lg scale-105"
              : "bg-[#1A1A1A] text-[#F9FDFF] hover:bg-[#2A2A2A]"
          )}
        >
          <span className="text-base">🌟</span>
          <span>All Events</span>
          {counts && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              !selected ? "bg-[#121113]/20" : "bg-[#59FFA0]/20 text-[#59FFA0]"
            )}>
              {Object.values(counts).reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        {CATEGORIES.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "shrink-0 snap-start px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all flex items-center gap-2 font-[family-name:var(--font-rubik)]",
              selected === value
                ? "bg-[#59FFA0] text-[#121113] shadow-lg scale-105"
                : "bg-[#1A1A1A] text-[#F9FDFF] hover:bg-[#2A2A2A]"
            )}
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
            {counts?.[value] !== undefined && counts[value] > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                selected === value ? "bg-[#121113]/20" : "bg-[#59FFA0]/20 text-[#59FFA0]"
              )}>
                {counts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-7 gap-4">
        <button
          onClick={() => onChange(null)}
          className={cn(
            "group relative p-6 rounded-2xl text-left transition-all hover:scale-105",
            "bg-gradient-to-br from-[#59FFA0]/10 to-[#1AC8ED]/10",
            "border-2 overflow-hidden",
            !selected
              ? "border-[#59FFA0] shadow-lg shadow-[#59FFA0]/20"
              : "border-[#2A2A2A] hover:border-[#59FFA0]/50"
          )}
        >
          <div className="relative z-10">
            <div className="text-4xl mb-3">🌟</div>
            <div className="font-bold text-lg mb-1 text-[#F9FDFF] font-[family-name:var(--font-rubik)]">All Events</div>
            {counts && (
              <div className="text-3xl font-bold text-[#59FFA0]">
                {Object.values(counts).reduce((a, b) => a + b, 0)}
              </div>
            )}
            <div className="text-xs text-[#A0A0A0] mt-1 font-[family-name:var(--font-rubik)]">total events</div>
          </div>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br from-[#59FFA0]/5 to-[#1AC8ED]/5 transition-opacity",
            !selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />
        </button>

        {CATEGORIES.map(({ value, label, icon, description, gradient }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "group relative p-6 rounded-2xl text-left transition-all hover:scale-105",
              "border-2 overflow-hidden bg-[#1A1A1A]",
              selected === value
                ? "border-[#59FFA0] shadow-lg shadow-[#59FFA0]/20"
                : "border-[#2A2A2A] hover:border-[#59FFA0]/50"
            )}
          >
            <div className="relative z-10">
              <div className="text-4xl mb-3">{icon}</div>
              <div className="font-bold text-lg mb-1 text-[#F9FDFF] font-[family-name:var(--font-rubik)]">{label}</div>
              {counts?.[value] !== undefined && (
                <div className="text-3xl font-bold text-[#59FFA0] mb-1">
                  {counts[value]}
                </div>
              )}
              <div className="text-xs text-[#A0A0A0] line-clamp-2 font-[family-name:var(--font-rubik)]">{description}</div>
            </div>
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br transition-opacity",
              gradient,
              selected === value ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )} />
          </button>
        ))}
      </div>
    </div>
  )
}