"use client"

import type { Event } from "@/types/event"
import { Calendar, MapPin, Clock } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"

interface EventCardProps {
  event: Event
  onClick?: () => void
  featured?: boolean
}

export function EventCard({ event, onClick, featured }: EventCardProps) {
  const [isPressed, setIsPressed] = useState(false)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy")
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a")
  }

  const formatPrice = () => {
    if (event.min_price === event.max_price) {
      return `$${event.min_price}`
    }
    return `$${event.min_price} - $${event.max_price}`
  }

  const isFeatured = featured ?? event.featured

  return (
    <article
      className="group relative w-full max-w-[320px] cursor-pointer select-none overflow-hidden rounded-2xl bg-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-400 ease-out hover:scale-[1.02] active:scale-[0.98] md:max-w-[360px]"
      style={{
        aspectRatio: isFeatured ? "3/4" : "4/5",
        boxShadow: isFeatured ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.4)",
      }}
      className={`group relative w-full max-w-[320px] cursor-pointer select-none overflow-hidden rounded-2xl bg-[#1A1A1A] transition-all duration-400 ease-out hover:scale-[1.02] active:scale-[0.98] md:max-w-[360px] ${
        isFeatured
          ? "shadow-[0_16px_48px_rgba(89,255,160,0.2)] hover:shadow-[0_20px_56px_rgba(89,255,160,0.25)]"
          : "shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_48px_rgba(89,255,160,0.15)]"
      }`}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Image Container with Gradient Overlay */}
      <div className="relative h-[55%] w-full overflow-hidden">
        <img
          src={event.flyer_image_url || "/placeholder.svg"}
          alt={event.name}
          className="h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-105"
        />
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1A1A1A]"
          style={{
            background: "linear-gradient(180deg, rgba(26,26,26,0) 0%, rgba(26,26,26,0.3) 50%, rgba(26,26,26,1) 100%)",
          }}
        />

        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute right-3 top-3 rounded-full bg-[#59FFA0]/20 px-3 py-1 backdrop-blur-md">
            <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#59FFA0]">
              Featured
            </span>
          </div>
        )}

        {/* Status Badge */}
        {event.status === "sold_out" && (
          <div className="absolute left-3 top-3 rounded-full bg-[#FF6B6B]/20 px-3 py-1 backdrop-blur-md">
            <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#FF6B6B]">
              Sold Out
            </span>
          </div>
        )}
        {event.status === "cancelled" && (
          <div className="absolute left-3 top-3 rounded-full bg-[#A0A0A0]/20 px-3 py-1 backdrop-blur-md">
            <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">
              Cancelled
            </span>
          </div>
        )}
      </div>

      {/* Content Container with Glass Effect */}
      <div className="relative h-[45%] p-5">
        {/* Glass Morphism Background */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[rgba(42,42,42,0.6)] to-[rgba(26,26,26,0.9)] backdrop-blur-xl"
          style={{
            background: "linear-gradient(180deg, rgba(42,42,42,0.6) 0%, rgba(26,26,26,0.9) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Title Section */}
          <div className="space-y-1">
            <h2
              className={`font-playfair font-bold leading-tight text-white transition-colors duration-300 group-hover:text-[#59FFA0] ${
                isFeatured ? "text-3xl md:text-[32px]" : "text-2xl md:text-[28px]"
              }`}
            >
              {event.name}
            </h2>
          </div>

          {/* Event Details */}
          <div className="space-y-2">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-[#E0E0E0]">
              <Calendar className="h-4 w-4 text-[#59FFA0]" />
              <span className="font-rubik text-sm font-medium">{formatDate(event.event_date)}</span>
              <Clock className="ml-2 h-4 w-4 text-[#59FFA0]" />
              <span className="font-rubik text-sm font-medium">{formatTime(event.event_date)}</span>
            </div>

            {/* Venue */}
            <div className="flex items-start gap-2 text-[#E0E0E0]">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1AC8ED]" />
              <div className="flex-1">
                <p className="font-rubik text-sm font-semibold leading-tight">{event.venue_name}</p>
                {event.venue_address && <p className="font-rubik text-xs text-[#A0A0A0]">{event.venue_address}</p>}
              </div>
            </div>

            {/* Price Range */}
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="font-montserrat text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">Price</span>
              <span className="font-rokkitt text-base font-semibold text-[#59FFA0]">{formatPrice()}</span>
            </div>
          </div>
        </div>

        {/* Shine Effect on Hover */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, transparent 0%, rgba(89,255,160,0.05) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Focus Ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent ring-offset-2 ring-offset-[#0A0A0A] transition-all duration-300 focus-visible:ring-[#59FFA0]" />
    </article>
  )
}
