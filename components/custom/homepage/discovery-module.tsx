"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

// ─── Types ──────────────────────────────────────────────────────────────────

type ActiveCategory = "concerts" | "bars" | "movies"

interface VenueRow {
  name: string
}

interface TicketTypeRow {
  price: number
}

interface HeroEvent {
  id: string
  name: string
  flyer_image_url: string | null
  venue: VenueRow | null
}

interface CardEvent {
  id: string
  name: string
  flyer_image_url: string | null
  featured: boolean | null
  category: string
  venue: VenueRow | null
  ticket_types: TicketTypeRow[]
}

// ─── Category mapping — pill value → DB enum value ───────────────────────────

const DB_CATEGORY: Record<ActiveCategory, string> = {
  concerts: "music",
  bars: "nightlife",
  movies: "movies",
}

// ─── Pills ───────────────────────────────────────────────────────────────────

const PILLS: { label: string; value: ActiveCategory; color: string }[] = [
  { label: "Concerts", value: "concerts", color: "#59FFA0" },
  { label: "Bars/Clubs", value: "bars", color: "#1AC8ED" },
  { label: "Movies", value: "movies", color: "#B87FFF" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMinPrice(ticketTypes: TicketTypeRow[]): string {
  if (!ticketTypes || ticketTypes.length === 0) return "Free"
  const min = Math.min(...ticketTypes.map((t) => t.price))
  return min === 0 ? "Free" : `$${min}`
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full h-[210px] rounded-2xl bg-[#2a2929] animate-pulse" />
  )
}

function CardSkeleton() {
  return (
    <div className="shrink-0 w-[175px] h-[225px] rounded-2xl bg-[#2a2929] animate-pulse" />
  )
}

// ─── Hero Card ───────────────────────────────────────────────────────────────

function HeroCard({
  event,
  categoryLabel,
}: {
  event: HeroEvent
  categoryLabel: string
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="relative block w-full h-[210px] rounded-2xl overflow-hidden"
    >
      {event.flyer_image_url ? (
        <Image
          src={event.flyer_image_url}
          alt={event.name}
          fill
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1a1a2e_0%,#16213e_40%,#0f3460_100%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      <span
        className="absolute top-2.5 right-3 text-white/60 uppercase tracking-widest"
        style={{ fontSize: "9px", fontFamily: "var(--font-rubik), sans-serif" }}
      >
        Sponsored
      </span>

      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider text-white/70"
          style={{ fontFamily: "var(--font-rubik), sans-serif" }}
        >
          {categoryLabel} &nbsp;·&nbsp; 50+ Events
        </p>

        <h3 className="font-header font-bold text-white text-xl leading-tight line-clamp-1">
          {event.name}
        </h3>

        {event.venue?.name && (
          <p
            className="text-[11px] text-white/60"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            {event.venue.name}
          </p>
        )}

        <div className="pt-1">
          <span
            className="inline-block bg-white text-[#121113] text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            Get Tickets →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CardEvent }) {
  const minPrice = getMinPrice(event.ticket_types)

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative shrink-0 w-[175px] h-[225px] rounded-2xl overflow-hidden block"
    >
      {event.flyer_image_url ? (
        <Image
          src={event.flyer_image_url}
          alt={event.name}
          fill
          className="object-cover"
          sizes="160px"
        />
      ) : (
        <div className="absolute inset-0 bg-[#1a1819]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute top-2 left-2">
        {event.featured ? (
          <span
            className="bg-[#59FFA0] text-[#121113] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            ✦ Featured
          </span>
        ) : (
          <span
            className="bg-black/50 text-white/80 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide backdrop-blur-sm"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            {event.category}
          </span>
        )}
      </div>

      <div className="absolute top-2 right-2">
        <span
          className="bg-black/50 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
          style={{ fontFamily: "var(--font-rubik), sans-serif" }}
        >
          {minPrice}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
        <h4 className="font-header font-bold text-white text-sm leading-tight line-clamp-2">
          {event.name}
        </h4>
        {event.venue?.name && (
          <p
            className="text-[10px] text-white/55 truncate"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            {event.venue.name}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DiscoveryModule() {
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("concerts")
  const [hero, setHero] = useState<HeroEvent | null>(null)
  const [cards, setCards] = useState<CardEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const supabase = createBrowserSupabaseClient()
    const dbCategory = DB_CATEGORY[activeCategory]

    async function fetchData() {
      try {
        // Query 1 — Hero: featured=true, fallback to top active
        const { data: featuredHero } = await supabase
          .from("events")
          .select("id, name, flyer_image_url, venue:venues(name)")
          .eq("category", dbCategory)
          .eq("status", "active")
          .eq("featured", true)
          .order("event_date", { ascending: true })
          .limit(1)
          .maybeSingle()

        let heroEvent = featuredHero as HeroEvent | null

        if (!heroEvent) {
          const { data: fallbackHero } = await supabase
            .from("events")
            .select("id, name, flyer_image_url, venue:venues(name)")
            .eq("category", dbCategory)
            .eq("status", "active")
            .order("event_date", { ascending: true })
            .limit(1)
            .maybeSingle()

          heroEvent = fallbackHero as HeroEvent | null
        }

        // Query 2 — Card row
        const { data: eventsData } = await supabase
          .from("events")
          .select(`
            id,
            name,
            flyer_image_url,
            featured,
            category,
            venue:venues(name),
            ticket_types(price)
          `)
          .eq("category", dbCategory)
          .eq("status", "active")
          .order("featured", { ascending: false })
          .order("event_date", { ascending: true })
          .limit(4)

        if (cancelled) return

        setHero(heroEvent)
        setCards((eventsData ?? []) as CardEvent[])
      } catch {
        if (!cancelled) {
          setHero(null)
          setCards([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [activeCategory])

  const activePill = PILLS.find((p) => p.value === activeCategory)!

  return (
    <section className="w-full px-4 py-4 space-y-3">
      {/* ── Hero ── */}
      {loading ? (
        <HeroSkeleton />
      ) : hero ? (
        <HeroCard event={hero} categoryLabel={activePill.label} />
      ) : (
        <div className="w-full h-[210px] rounded-2xl bg-[#1a1819]" />
      )}

      {/* ── Category Pills ── */}
      <div className="flex gap-2">
        {PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setActiveCategory(pill.value)}
            className="px-4 py-[10px] rounded-full text-xs font-semibold transition-colors"
            style={{
              backgroundColor:
                activeCategory === pill.value ? pill.color : "#1A1A1A",
              color: activeCategory === pill.value ? "#121113" : "#f9fdff",
              fontFamily: "var(--font-rubik), sans-serif",
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Card Row ── */}
      <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((card) => <EventCard key={card.id} event={card} />)}

        {!loading && (
          <Link
            href={`/events?category=${DB_CATEGORY[activeCategory]}`}
            className="shrink-0 w-[80px] h-[210px] rounded-2xl bg-[#1a1819] hover:bg-[#222] transition-colors flex flex-col items-center justify-center gap-1.5 text-white/50 hover:text-white/80"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            <span className="text-xl">→</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-center leading-tight">
              See All
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
