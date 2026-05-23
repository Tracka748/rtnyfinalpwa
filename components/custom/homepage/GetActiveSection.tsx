"use client"

import SectionTitleStrip from '@/components/custom/homepage/SectionTitleStrip'

const ACTIVE_EVENTS = [
  {
    id: "ga1",
    emoji: "🧘",
    name: "Strong Hearts Yoga Flow",
    venue: "Yoga Smith",
    schedule: "Saturdays 9am",
    category: "Wellness",
    intensity: "All Levels",
    gradient: "from-[#064e3b] to-[#0d4a4a]",
  },
  {
    id: "ga2",
    emoji: "🚴",
    name: "ROC City Bike Co Group Ride",
    venue: "Genesee Riverway Trail",
    schedule: "Sundays 8am",
    category: "Cycling",
    intensity: "All Levels",
    gradient: "from-[#1e3a8a] to-[#0e4d6a]",
  },
  {
    id: "ga3",
    emoji: "🏃",
    name: "Seneca Park Running Club",
    venue: "Seneca Park",
    schedule: "Tuesdays 6:30pm",
    category: "Running",
    intensity: "Beginner",
    gradient: "from-[#7c2d12] to-[#92400e]",
  },
  {
    id: "ga4",
    emoji: "🧗",
    name: "Rochester Bouldering Project Open Climb",
    venue: "RBP",
    schedule: "Daily",
    category: "Rock Climbing",
    intensity: "All Levels",
    gradient: "from-[#292524] to-[#44403c]",
  },
  {
    id: "ga5",
    emoji: "🏋️",
    name: "Genesee Valley CrossFit Throwdown",
    venue: "GV CrossFit",
    schedule: "June 22",
    category: "Competition",
    intensity: "Advanced",
    gradient: "from-[#7f1d1d] to-[#6b21a8]",
  },
  {
    id: "ga6",
    emoji: "🛶",
    name: "Lakeshore Kayak Meetup",
    venue: "Ontario Beach Park",
    schedule: "June 29",
    category: "Outdoor",
    intensity: "All Levels",
    gradient: "from-[#0c4a6e] to-[#1e3a8a]",
  },
]

const INTENSITY_COLORS: Record<string, string> = {
  Beginner: "rgba(89,255,160,0.15)",
  "All Levels": "rgba(26,200,237,0.15)",
  Advanced: "rgba(255,59,48,0.15)",
}

const INTENSITY_TEXT: Record<string, string> = {
  Beginner: "#59FFA0",
  "All Levels": "#1AC8ED",
  Advanced: "#FF6B6B",
}

export default function GetActiveSection() {
  return (
    <section className="w-full bg-[#121113]">
      <SectionTitleStrip
        label="Get Active"
        sublabel="MOVE WITH ROCHESTER"
        accentColor="#1AC8ED"
      />

      <div className="px-4 py-6">

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`.get-active-row::-webkit-scrollbar { display: none; }`}</style>

        {ACTIVE_EVENTS.map((item) => (
          <div
            key={item.id}
            className={`relative w-[240px] h-[200px] shrink-0 snap-start rounded-xl overflow-hidden bg-gradient-to-br ${item.gradient} cursor-pointer group`}
          >
            {/* Emoji icon — top left */}
            <div
              className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid rgba(26,200,237,0.5)" }}
            >
              {item.emoji}
            </div>

            {/* Intensity badge — top RIGHT */}
            <div
              className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full"
              style={{
                background: INTENSITY_COLORS[item.intensity] ?? "rgba(0,0,0,0.45)",
                border: `1px solid ${INTENSITY_TEXT[item.intensity] ?? "#1AC8ED"}33`,
              }}
            >
              <span
                className="text-[9px] uppercase tracking-wider font-bold"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  color: INTENSITY_TEXT[item.intensity] ?? "#1AC8ED",
                }}
              >
                {item.intensity}
              </span>
            </div>

            {/* Bottom gradient overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10"
              style={{
                height: "60%",
                background: "linear-gradient(to top, #121113 0%, transparent 100%)",
              }}
            />

            {/* Card content */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
              {/* Category label — cyan instead of mint */}
              <p
                className="uppercase tracking-wider text-[10px] mb-1"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  color: "#1AC8ED",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                {item.category}
              </p>

              {/* Activity name */}
              <h3
                className="text-[14px] font-bold text-[#F9FDFF] leading-snug line-clamp-2 mb-2"
                style={{ fontFamily: "Rokkitt, serif" }}
              >
                {item.name}
              </h3>

              {/* Venue + schedule row */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] text-[rgba(249,253,255,0.55)] truncate max-w-[130px]"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  📍 {item.venue}
                </span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    background: "rgba(26,200,237,0.12)",
                    color: "#1AC8ED",
                    fontWeight: 600,
                  }}
                >
                  {item.schedule}
                </span>
              </div>

              {/* Learn More label — appears on hover */}
              <p
                className="text-[9px] uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  color: "rgba(249,253,255,0.4)",
                }}
              >
                Learn More →
              </p>
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  )
}
