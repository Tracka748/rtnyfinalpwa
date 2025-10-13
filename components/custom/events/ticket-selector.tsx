// components/custom/events/ticket-selector.tsx
"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TicketType {
  id: string
  name: string
  price: number
  quantity: number
  remaining: number
}

interface TicketSelectorProps {
  ticketTypes: TicketType[]
  quantities: Record<string, number>
  onQuantityChange: (ticketId: string, delta: number) => void
}

export function TicketSelector({
  ticketTypes,
  quantities,
  onQuantityChange,
}: TicketSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-playfair)]">
        Select Tickets
      </h2>
      <div className="space-y-3">
        {ticketTypes.map((ticket) => {
          const isTicketSoldOut = ticket.remaining === 0
          const quantity = quantities[ticket.id] || 0

          return (
            <div
              key={ticket.id}
              className={`
                group p-4 rounded-xl border transition-all duration-300
                ${
                  isTicketSoldOut
                    ? "bg-[#1A1A1A]/40 border-[#2A2A2A] opacity-50"
                    : "bg-[#1A1A1A]/60 border-[#2A2A2A] hover:border-[#59FFA0]/30 backdrop-blur-sm hover:shadow-lg hover:shadow-[#59FFA0]/5"
                }
              `}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)] transition-colors duration-300 group-hover:text-[#59FFA0]">
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
                        onClick={() => onQuantityChange(ticket.id, -1)}
                        disabled={quantity === 0}
                        className="h-8 w-8 rounded-full border-[#59FFA0]/30 hover:bg-[#59FFA0]/10 hover:border-[#59FFA0] hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-200"
                      >
                        <Minus className="h-4 w-4 text-[#59FFA0]" />
                      </Button>
                      <span className="w-8 text-center text-lg font-semibold text-[#F9FDFF] font-[family-name:var(--font-rubik)] tabular-nums">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onQuantityChange(ticket.id, 1)}
                        disabled={quantity >= ticket.remaining}
                        className="h-8 w-8 rounded-full border-[#59FFA0]/30 hover:bg-[#59FFA0]/10 hover:border-[#59FFA0] hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-200"
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
  )
}