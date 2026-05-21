"use client"

const SPORTS_EVENTS = [
  {
    id: "s1",
    emoji: "⚾",
    name: "Rochester Red Wings vs. Syracuse Mets",
    venue: "Frontier Field",
    date: "Jun 14",
    category: "Baseball",
    gradient: "from-[#003087] to-[#CC0000]",
  },
  {
    id: "s2",
    emoji: "🥍",
    name: "Rochester Knighthawks vs. Albany FireWolves",
    venue: "Blue Cross Arena",
    date: "Jun 21",
    category: "Lacrosse",
    gradient: "from-[#1E3A5F] to-[#FF6B00]",
  },
  {
    id: "s3",
    emoji: "⚽",
    name: "Rochester FC vs. Hartford",
    venue: "Sahlen's Stadium",
    date: "Jun 28",
    category: "Soccer",
    gradient: "from-[#006400] to-[#1A472A]",
  },
  {
    id: "s4",
    emoji: "🛼",
    name: "ROC City Roller Derby Bout",
    venue: "Main Street Armory",
    date: "Jul 5",
    category: "Roller Derby",
    gradient: "from-[#4A0072] to-[#8B0000]",
  },
  {
    id: "s5",
    emoji: "🏒",
    name: "Buffalo Sabres Watch Party",
    venue: "Dinosaur Bar-B-Que",
    date: "Jun 18",
    category: "NHL Watch",
    gradient: "from-[#003087] to-[#FFB800]",
  },
]

export default function RochesterSportsSection() {
  return (
    <section className="w-full px-4 py-6 bg-[#121113]">
      {/* Section header */}
      <div className="flex items-center justify-between mb-1">
        <h2
          className="text-[22px] font-bold text-[#F9FDFF]"
          style={{ fontFamily: "Rokkitt, serif" }}
        >
          🏟️ Rochester Sports
        </h2>
        <a
          href="/sports"
          className="text-sm"
          style={{ fontFamily: "Montserrat, sans-serif", color: "#1AC8ED", fontWeight: 500 }}
        >
          See All →
        </a>
      </div>
      <p className="text-[13px] text-[rgba(249,253,255,0.45)] mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Cheer on your city
      </p>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`.sports-row::-webkit-scrollbar { display: none; }`}</style>

        {SPORTS_EVENTS.map((event) => (
          <div
            key={event.id}
            className={`relative w-[220px] h-[280px] shrink-0 snap-start rounded-xl overflow-hidden bg-gradient-to-br ${event.gradient} cursor-pointer group`}
          >
            {/* Sport emoji badge — top left */}
            <div
              className="absolute top-3 left-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid #59FFA0" }}
            >
              {event.emoji}
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
                {event.name}
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
                  {event.date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
