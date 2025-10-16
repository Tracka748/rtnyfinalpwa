// components/custom/events/event-detail.tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MapPin } from "lucide-react"
import { AppNav } from "@/components/custom/layout/app-nav"
import { TicketSelector } from "./ticket-selector"
import { PurchaseSummary } from "./purchase-summary"
import type { EventWithTickets } from "@/types/event"

interface EventDetailProps {
  event: EventWithTickets
  onPurchase: (selections: Array<{ ticketTypeId: string; quantity: number }>) => void
  onBack?: () => void
}

export function EventDetail({ event, onPurchase, onBack }: EventDetailProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    event.ticketTypes.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {}),
  )

  const updateQuantity = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const ticket = event.ticketTypes.find((t) => t.id === ticketId)
      if (!ticket) return prev

      const newQuantity = Math.max(0, Math.min(ticket.remaining, (prev[ticketId] || 0) + delta))
      return { ...prev, [ticketId]: newQuantity }
    })
  }

  const totalPrice = event.ticketTypes.reduce((sum, ticket) => {
    return sum + ticket.price * (quantities[ticket.id] || 0)
  }, 0)

  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

  const handlePurchase = () => {
    const selections = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))

    if (selections.length > 0) {
      onPurchase(selections)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event.name,
          text: `Check out ${event.name} at ${event.venue_name}`,
          url: window.location.href,
        })
        .catch((err) => console.log("Error sharing:", err))
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const eventDate = new Date(event.event_date)
  const isSoldOut = event.status === "sold_out"
  const isCancelled = event.status === "cancelled"

  return (
    <div className="min-h-screen bg-[#121113] text-[#F9FDFF]">
      {/* App Navigation */}
      <AppNav 
        showBack 
        onBack={onBack} 
        showShare
        onShare={handleShare}
      />

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/5] md:aspect-[16/9] mt-16">
        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-20 animate-in fade-in slide-in-from-left duration-500">
          <span className="inline-block px-3 py-1 text-xs font-medium tracking-wide uppercase bg-[#59FFA0] text-[#121113] rounded-full font-[family-name:var(--font-montserrat)] shadow-lg">
            {event.category}
          </span>
        </div>

        {/* Event Image */}
        <img
          src={event.flyer_image_url || "/placeholder.svg"}
          alt={event.name}
          className="w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121113] via-[#121113]/60 to-transparent" />

        {/* Event Title */}
        <div className="absolute bottom-6 left-6 right-6 z-10 animate-in fade-in slide-in-from-bottom duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rokkitt)] leading-tight">
            {event.name}
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-32">
        {/* Date & Time */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
          <div className="text-3xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
            {format(eventDate, "EEEE, MMMM d")}
          </div>
          <div className="text-xl text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)]">
            {format(eventDate, "h:mm a")}
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-500 delay-200">
          <MapPin className="h-5 w-5 text-[#1AC8ED] mt-1 flex-shrink-0" />
          <div>
            <div className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
              {event.venue_name}
            </div>
            <div className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
              {event.venue_address}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom duration-500 delay-300">
          <h2 className="text-xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-playfair)]">
            About This Event
          </h2>
          <p className="text-[#F9FDFF]/80 leading-relaxed font-[family-name:var(--font-rubik)]">
            {event.description}
          </p>
        </div>

        {/* Price Range */}
        <div className="flex items-baseline gap-2 animate-in fade-in slide-in-from-bottom duration-500 delay-400">
          <span className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
            Price Range:
          </span>
          <span className="text-2xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
            ${event.min_price} - ${event.max_price}
          </span>
        </div>

        {/* Status Messages */}
        {isCancelled && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-bottom duration-500 delay-500">
            <p className="text-red-400 font-semibold font-[family-name:var(--font-rubik)]">
              This event has been cancelled.
            </p>
          </div>
        )}

        {isSoldOut && !isCancelled && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 animate-in fade-in slide-in-from-bottom duration-500 delay-500">
            <p className="text-yellow-400 font-semibold font-[family-name:var(--font-rubik)]">
              This event is sold out.
            </p>
          </div>
        )}

        {/* Ticket Selection */}
        {!isCancelled && !isSoldOut && (
          <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-600">
            <TicketSelector
              ticketTypes={event.ticketTypes}
              quantities={quantities}
              onQuantityChange={updateQuantity}
            />
          </div>
        )}
      </div>

      {/* Purchase Summary */}
      {!isCancelled && !isSoldOut && (
        <PurchaseSummary
          totalQuantity={totalQuantity}
          totalPrice={totalPrice}
          onPurchase={handlePurchase}
        />
      )}
    </div>
  )
}
