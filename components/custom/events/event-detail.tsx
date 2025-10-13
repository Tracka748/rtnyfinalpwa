"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowLeft, Share2, MapPin, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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

  const eventDate = new Date(event.event_date)
  const isSoldOut = event.status === "sold_out"
  const isCancelled = event.status === "cancelled"

  return (
    <div className="min-h-screen bg-[#121113] text-[#F9FDFF]">
      {/* Hero Section */}
      <div className="relative w-full aspect-[4/5] md:aspect-[16/9]">
        {/* Navigation Buttons */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-300"
          >
            <Share2 className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Category Badge */}
        <div className="absolute top-20 left-4 z-20">
          <span className="inline-block px-3 py-1 text-xs font-medium tracking-wide uppercase bg-[#59FFA0] text-[#121113] rounded-full font-[family-name:var(--font-montserrat)]">
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
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-rokkitt)] leading-tight">
            {event.name}
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Date & Time */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
            {format(eventDate, "EEEE, MMMM d")}
          </div>
          <div className="text-xl text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)]">
            {format(eventDate, "h:mm a")}
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-[#1AC8ED] mt-1 flex-shrink-0" />
          <div>
            <div className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
              {event.venue_name}
            </div>
            <div className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">{event.venue_address}</div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-playfair)]">
            About This Event
          </h2>
          <p className="text-[#F9FDFF]/80 leading-relaxed font-[family-name:var(--font-rubik)]">{event.description}</p>
        </div>

        {/* Price Range */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">Price Range:</span>
          <span className="text-2xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
            ${event.min_price} - ${event.max_price}
          </span>
        </div>

        {/* Status Messages */}
        {isCancelled && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 font-semibold font-[family-name:var(--font-rubik)]">
              This event has been cancelled.
            </p>
          </div>
        )}

        {isSoldOut && !isCancelled && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-400 font-semibold font-[family-name:var(--font-rubik)]">
              This event is sold out.
            </p>
          </div>
        )}

        {/* Ticket Selection */}
        {!isCancelled && !isSoldOut && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-playfair)]">
              Select Tickets
            </h2>
            <div className="space-y-3">
              {event.ticketTypes.map((ticket) => {
                const isTicketSoldOut = ticket.remaining === 0
                const quantity = quantities[ticket.id] || 0

                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isTicketSoldOut
                        ? "bg-[#1A1A1A]/40 border-[#2A2A2A] opacity-50"
                        : "bg-[#1A1A1A]/60 border-[#2A2A2A] hover:border-[#59FFA0]/30 backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
                          {ticket.name}
                        </div>
                        <div className="text-sm text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
                          {isTicketSoldOut ? "Sold Out" : `${ticket.remaining} available`}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
                          ${ticket.price}
                        </div>
                        {!isTicketSoldOut && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(ticket.id, -1)}
                              disabled={quantity === 0}
                              className="h-8 w-8 rounded-full border-[#59FFA0]/30 hover:bg-[#59FFA0]/10 hover:border-[#59FFA0] disabled:opacity-30"
                            >
                              <Minus className="h-4 w-4 text-[#59FFA0]" />
                            </Button>
                            <span className="w-8 text-center text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)]">
                              {quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(ticket.id, 1)}
                              disabled={quantity >= ticket.remaining}
                              className="h-8 w-8 rounded-full border-[#59FFA0]/30 hover:bg-[#59FFA0]/10 hover:border-[#59FFA0] disabled:opacity-30"
                            >
                              <Plus className="h-4 w-4 text-[#59FFA0]" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Purchase Section */}
        {!isCancelled && !isSoldOut && (
          <div className="sticky bottom-0 -mx-6 px-6 py-6 bg-gradient-to-t from-[#121113] via-[#121113] to-transparent">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)]">
                  Total ({totalQuantity} {totalQuantity === 1 ? "ticket" : "tickets"})
                </span>
                <span className="text-3xl font-bold text-[#59FFA0] font-[family-name:var(--font-playfair)]">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={totalQuantity === 0}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] hover:from-[#4DE690] hover:to-[#0AB8DD] text-[#121113] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-[family-name:var(--font-rubik)]"
              >
                Purchase Tickets
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
