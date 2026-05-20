"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

interface VenueRow {
  name: string
}

interface TicketTypeRow {
  price: number
}

interface PersonalizedEvent {
  id: string
  name: string
  flyer_image_url: string | null
  featured: boolean | null
  category: string
  venue: VenueRow | null
  ticket_types: TicketTypeRow[]
}

const EVENT_SELECT = `
  id,
  name,
  flyer_image_url,
  featured,
  category,
  venue:venues(name),
  ticket_types(price)
`

function getMinPrice(ticketTypes: TicketTypeRow[]): string {
  if (!ticketTypes || ticketTypes.length === 0) return "Free"
  const min = Math.min(...ticketTypes.map((t) => t.price))
  return min === 0 ? "Free" : `$${min}`
}

function CardSkeleton() {
  return (
    <div className="shrink-0 w-[160px] h-[210px] rounded-2xl bg-[#2a2929] animate-pulse" />
  )
}

function EventCard({ event }: { event: PersonalizedEvent }) {
  const minPrice = getMinPrice(event.ticket_types)

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative shrink-0 w-[160px] h-[210px] rounded-2xl overflow-hidden block"
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

export function PersonalizedRow() {
  const [events, setEvents] = useState<PersonalizedEvent[]>([])
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(true)
  const [hide, setHide] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      const supabase = createBrowserSupabaseClient()
      const now = new Date().toISOString()

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          const { data } = await supabase
            .from("events")
            .select(EVENT_SELECT)
            .eq("status", "active")
            .gt("event_date", now)
            .order("tickets_sold", { ascending: false })
            .limit(4)

          if (!cancelled) {
            setLabel("🔥 Popular Right Now")
            setEvents((data ?? []) as PersonalizedEvent[])
          }
          return
        }

        const [savedResult, ordersResult] = await Promise.all([
          supabase
            .from("saved_events")
            .select("event_id")
            .eq("user_id", user.id),
          supabase
            .from("orders")
            .select("event:events(category)")
            .eq("user_id", user.id)
            .eq("status", "completed"),
        ])

        const savedIds: string[] = (savedResult.data ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => r.event_id)
          .filter(Boolean)

        const orderedCategories: string[] = [
          ...new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (ordersResult.data ?? []).map((r: any) => r.event?.category).filter(Boolean) as string[]
          ),
        ]

        if (savedIds.length === 0 && orderedCategories.length === 0) {
          if (!cancelled) setHide(true)
          return
        }

        const collected: PersonalizedEvent[] = []
        const seenIds = new Set<string>()

        // Slot 1-2: saved events
        if (savedIds.length > 0) {
          const { data: savedEvents } = await supabase
            .from("events")
            .select(EVENT_SELECT)
            .in("id", savedIds)
            .eq("status", "active")
            .gt("event_date", now)
            .order("event_date", { ascending: true })
            .limit(2)

          for (const e of (savedEvents ?? []) as PersonalizedEvent[]) {
            if (!seenIds.has(e.id)) {
              seenIds.add(e.id)
              collected.push(e)
            }
          }
        }

        // Slots 3-4: category matches
        if (collected.length < 4 && orderedCategories.length > 0) {
          const { data: catEvents } = await supabase
            .from("events")
            .select(EVENT_SELECT)
            .in("category", orderedCategories)
            .eq("status", "active")
            .gt("event_date", now)
            .order("event_date", { ascending: true })
            .limit(10)

          for (const e of (catEvents ?? []) as PersonalizedEvent[]) {
            if (!seenIds.has(e.id) && collected.length < 4) {
              seenIds.add(e.id)
              collected.push(e)
            }
          }
        }

        // Fallback: popular
        if (collected.length < 4) {
          const { data: popular } = await supabase
            .from("events")
            .select(EVENT_SELECT)
            .eq("status", "active")
            .gt("event_date", now)
            .order("tickets_sold", { ascending: false })
            .limit(10)

          for (const e of (popular ?? []) as PersonalizedEvent[]) {
            if (!seenIds.has(e.id) && collected.length < 4) {
              seenIds.add(e.id)
              collected.push(e)
            }
          }
        }

        if (!cancelled) {
          setLabel("✦ Your Favorites")
          setEvents(collected)
        }
      } catch {
        if (!cancelled) setHide(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  if (!loading && hide) return null
  if (!loading && events.length === 0) return null

  return (
    <section className="w-full px-4 py-4 space-y-3">
      {loading ? (
        <div className="h-6 w-44 rounded-lg bg-[#2a2929] animate-pulse" />
      ) : (
        <h2
          className="font-header font-bold text-foreground text-lg"
          style={{ fontFamily: "var(--font-rubik), sans-serif" }}
        >
          {label}
        </h2>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : events.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </section>
  )
}
