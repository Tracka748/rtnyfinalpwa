"use client"

import SectionTitleStrip from '@/components/custom/homepage/SectionTitleStrip'
import type { Event } from '@/lib/homepage/types'
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils'

interface RochesterSportsSectionProps {
  events: Event[]
}

const CARD_ACCENTS = [
  { emoji: "⚾", gradient: "from-[#003087] to-[#CC0000]" },
  { emoji: "🥍", gradient: "from-[#1E3A5F] to-[#FF6B00]" },
  { emoji: "⚽", gradient: "from-[#006400] to-[#1A472A]" },
  { emoji: "🛼", gradient: "from-[#4A0072] to-[#8B0000]" },
  { emoji: "🏒", gradient: "from-[#003087] to-[#FFB800]" },
]

export default function RochesterSportsSection({ events }: RochesterSportsSectionProps) {
  return (
    <section className="w-full bg-[#121113]">
      <SectionTitleStrip
        label="Rochester Sports"
        sublabel="ROCHESTER · NEW YORK"
        accentColor="#59FFA0"
      />

      <div className="px-4 py-6">

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`.sports-row::-webkit-scrollbar { display: none; }`}</style>

        {events.map((event, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
          return (
          <div
            key={event.id}
            className="relative w-[220px] h-[280px] shrink-0 snap-start rounded-xl overflow-hidden cursor-pointer group"
          >
            {/* Flyer image background */}
            <img
              src={getEventImage(event.image, event.category)}
              alt={event.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_EVENT_IMAGE
              }}
            />

            {/* Color accent overlay — reduced opacity so the photo shows through */}
            <div
              className={`absolute inset-0 z-[1] bg-gradient-to-br ${accent.gradient} opacity-40`}
            />

            {/* Sport emoji badge — top left */}
            <div
              className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid #59FFA0" }}
            >
              {accent.emoji}
            </div>

            {/* Bottom gradient overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10"
              style={{
                height: "65%",
                background: "linear-gradient(to top, #121113 0%, transparent 100%)",
              }}
            />

            {/* Card content */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
              {/* Sport category label */}
              <p
                className="uppercase tracking-wider text-[10px] mb-1"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  color: "#59FFA0",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                {event.category}
              </p>

              {/* Event name */}
              <h3
                className="text-[15px] font-bold text-[#F9FDFF] leading-snug line-clamp-2 mb-2"
                style={{ fontFamily: "Rokkitt, serif" }}
              >
                {event.title}
              </h3>

              {/* Venue + date */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] text-[rgba(249,253,255,0.6)]"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  📍 {event.venue}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    background: "rgba(89,255,160,0.15)",
                    color: "#59FFA0",
                    fontWeight: 600,
                  }}
                >
                  {event.time}
                </span>
              </div>
            </div>
          </div>
          )
        })}
      </div>
      </div>
    </section>
  )
}
