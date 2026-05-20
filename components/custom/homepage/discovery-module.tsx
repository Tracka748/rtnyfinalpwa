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

interface EventRow {
  id: string
  name: string
  event_date: string
  flyer_image_url: string | null
  featured: boolean | null
  category: string
  venues: VenueRow | null
  ticket_types: TicketTypeRow[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PILLS: { label: string; value: ActiveCategory; color: string }[] = [
  { label: "Concerts", value: "concerts", color: "#59FFA0" },
  { label: "Bars/Clubs", value: "bars", color: "#1AC8ED" },
  { label: "Movies", value: "movies", color: "#B87FFF" },
]

function getCategoryFilter(cat: ActiveCategory): string[] {
  return cat === "bars" ? ["bars", "nightlife"] : [cat]
}

function getMinPrice(ticketTypes: TicketTypeRow[]): string {
  if (!ticketTypes || ticketTypes.length === 0) return "Free"
  const min = Math.min(...ticketTypes.map((t) => t.price))
  return min === 0 ? "Free" : `$${min}`
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full h-[200px] rounded-2xl bg-[#1a1819] animate-pulse" />
  )
}

function CardSkeleton() {
  return (
    <div className="shrink-0 w-[160px] h-[210px] rounded-2xl bg-[#1a1819] animate-pulse" />
  )
}

// ─── Hero Card ───────────────────────────────────────────────────────────────

function HeroCard({
  event,
  categoryLabel,
}: {
  event: EventRow
  categoryLabel: string
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="relative block w-full h-[200px] rounded-2xl overflow-hidden"
    >
      {/* Background image */}
      {event.flyer_image_url ? (
        <Image
          src={event.flyer_image_url}
          alt={event.name}
          fill
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[#1a1819]" />
      )}

      {/* Dark gradient overlay — bottom to top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* SPONSORED label — top right */}
      <span
        className="absolute top-2.5 right-3 text-white/60 uppercase tracking-widest"
        style={{ fontSize: "9px", fontFamily: "var(--font-rubik), sans-serif" }}
      >
        Sponsored
      </span>

      {/* Content — bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
        {/* Eyebrow */}
        <p
          className="text-[10px] font-semibold uppercase tracking-wider text-white/70"
          style={{ fontFamily: "var(--font-rubik), sans-serif" }}
        >
          {categoryLabel} &nbsp;·&nbsp; 50+ Events
        </p>

        {/* Event title */}
        <h3 className="font-header font-bold text-white text-xl leading-tight line-clamp-1">
          {event.name}
        </h3>

        {/* Venue */}
        {event.venues?.name && (
          <p
            className="text-[11px] text-white/60"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            {event.venues.name}
          </p>
        )}

        {/* CTA */}
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

function EventCard({ event }: { event: EventRow }) {
  const minPrice = getMinPrice(event.ticket_types)

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative shrink-0 w-[160px] h-[210px] rounded-2xl overflow-hidden block"
    >
      {/* Full-bleed image */}
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

      {/* Subtle dark overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Badge — top left */}
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

      {/* Price — top right */}
      <div className="absolute top-2 right-2">
        <span
          className="bg-black/50 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
          style={{ fontFamily: "var(--font-rubik), sans-serif" }}
        >
          {minPrice}
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
        <h4 className="font-header font-bold text-white text-sm leading-tight line-clamp-2">
          {event.name}
        </h4>
        {event.venues?.name && (
          <p
            className="text-[10px] text-white/55 truncate"
            style={{ fontFamily: "var(--font-rubik), sans-serif" }}
          >
            {event.venues.name}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DiscoveryModule() {
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("concerts")
  const [hero, setHero] = useState<EventRow | null>(null)
  const [cards, setCards] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const supabase = createBrowserSupabaseClient()
    const filter = getCategoryFilter(activeCategory)

    async function fetchData() {
      const [heroRes, cardsRes] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id, name, event_date, flyer_image_url, featured, category, venues(name), ticket_types(price)"
          )
          .eq("featured", true)
          .in("category", filter)
          .order("event_date", { ascending: true })
          .limit(1),
        supabase
          .from("events")
          .select(
            "id, name, event_date, flyer_image_url, featured, category, venues(name), ticket_types(price)"
          )
          .in("category", filter)
          .order("featured", { ascending: false })
          .order("event_date", { ascending: true })
          .limit(4),
      ])

      if (cancelled) return

      const heroEvent = (heroRes.data?.[0] ?? cardsRes.data?.[0] ?? null) as EventRow | null
      const cardEvents = (cardsRes.data ?? []) as EventRow[]

      setHero(heroEvent)
      setCards(cardEvents)
      setLoading(false)
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
        <div className="w-full h-[200px] rounded-2xl bg-[#1a1819] flex items-center justify-center text-white/30 text-sm">
          No events available
        </div>
      )}

      {/* ── Category Pills ── */}
      <div className="flex gap-2">
        {PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setActiveCategory(pill.value)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
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
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((card) => <EventCard key={card.id} event={card} />)}

        {!loading && (
          <Link
            href={`/events?category=${activeCategory}`}
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
