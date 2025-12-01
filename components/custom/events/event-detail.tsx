"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowLeft, Share2, MapPin, Calendar, Clock, Users, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TicketType {
  id: string
  name: string
  price: number
  description?: string
  quantity: number
  remaining: number
}

interface BoostSlot {
  id: string
  name: string
  description: string
  price: number
  icon?: string
  memberOnly: boolean
}

interface EventDetailProps {
  event: {
    id: string
    name: string
    description: string
    event_date: string
    venue_name: string
    venue_address: string
    flyer_image_url: string | null
    category: string
    status: string
    ticket_types: TicketType[]
    spotlight_text?: string
    music_genre?: string
    min_age?: number
    start_time?: string
    end_time?: string
  }
  quantities: Record<string, number>
  onQuantityChange: (ticketId: string, delta: number) => void
  onPurchase: () => void
  onBack?: () => void
  onShare?: () => void
  totalQuantity: number
  totalPrice: number
  isMember?: boolean
}

export function EventDetail({
  event,
  quantities,
  onQuantityChange,
  onPurchase,
  onBack,
  onShare,
  totalQuantity,
  totalPrice,
  isMember = false
}: EventDetailProps) {
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([])

  // Sample boost data - can be passed as prop later
  const availableBoosts: BoostSlot[] = [
    { id: '1', name: 'VIP Entry', description: 'Skip the line', price: 10, icon: '🎁', memberOnly: true },
    { id: '2', name: 'Free Drink', description: '1 drink ticket', price: 8, icon: '🍹', memberOnly: true },
    { id: '3', name: 'Photo Booth', description: 'Unlimited photos', price: 5, icon: '📸', memberOnly: false },
    { id: '4', name: 'Coat Check', description: 'Free coat check', price: 5, icon: '👔', memberOnly: true },
    { id: '5', name: 'Parking Pass', description: 'Reserved parking', price: 15, icon: '🚗', memberOnly: true },
    { id: '6', name: 'Meet & Greet', description: 'Meet the artist', price: 25, icon: '🤝', memberOnly: true },
    { id: '7', name: 'Early Access', description: '30 min early entry', price: 12, icon: '⏰', memberOnly: true },
    { id: '8', name: 'Merch Bundle', description: 'Event merch', price: 20, icon: '👕', memberOnly: false },
  ]

  const toggleBoost = (boostId: string) => {
    if (!isMember && availableBoosts.find(b => b.id === boostId)?.memberOnly) {
      return
    }
    
    setSelectedBoosts(prev =>
      prev.includes(boostId)
        ? prev.filter(id => id !== boostId)
        : [...prev, boostId]
    )
  }

  const eventDate = new Date(event.event_date)
  const isSoldOut = event.status === "sold_out"
  const isCancelled = event.status === "cancelled"

  // Calculate total with boosts
  const boostTotal = selectedBoosts.reduce((sum, boostId) => {
    const boost = availableBoosts.find(b => b.id === boostId)
    return sum + (boost?.price || 0)
  }, 0)

  const grandTotal = totalPrice + boostTotal

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
            onClick={onShare}
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
        {event.flyer_image_url ? (
          <img
            src={event.flyer_image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#121113]" />
        )}

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
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* NEW: Two-Column Layout - Event Details + Ticket Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Event Detail Highlights */}
          <Card className="border-2 border-[#59FFA0]/20 bg-[#1A1A1A]/60 backdrop-blur-sm h-fit">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-6 text-[#F9FDFF] font-[family-name:var(--font-poppins)]">
                Event Details
              </h2>
              
              <div className="space-y-5">
                {/* Event Spotlight */}
                {event.spotlight_text && (
                  <div className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">🎊</span>
                    <div className="flex-1">
                      <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                        Event Spotlight
                      </p>
                      <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                        {event.spotlight_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-start gap-4">
                  <Calendar className="h-6 w-6 text-[#59FFA0] flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                      Date
                    </p>
                    <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                      {format(eventDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 text-[#59FFA0] flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                      Time
                    </p>
                    <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                      {event.start_time || format(eventDate, "h:mm a")}
                      {event.end_time && ` - ${event.end_time}`}
                    </p>
                  </div>
                </div>

                {/* Age */}
                {event.min_age && (
                  <div className="flex items-start gap-4">
                    <Users className="h-6 w-6 text-[#59FFA0] flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                        Age Requirement
                      </p>
                      <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                        {event.min_age}+ (ID Required)
                      </p>
                    </div>
                  </div>
                )}

                {/* Music */}
                {event.music_genre && (
                  <div className="flex items-start gap-4">
                    <Music className="h-6 w-6 text-[#59FFA0] flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                        Music
                      </p>
                      <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                        {event.music_genre}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#1AC8ED] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                        Location
                      </p>
                      <p className="text-[#F9FDFF] text-lg font-medium mb-1 font-[family-name:var(--font-rubik)]">
                        {event.venue_name}
                      </p>
                      <p className="text-[#F9FDFF]/60 text-sm font-[family-name:var(--font-rubik)]">
                        {event.venue_address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Ticket Selection (Your existing TicketSelector will go here via page.tsx) */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-poppins)]">
              Select Tickets
            </h2>
            {/* TicketSelector component will be inserted here by parent */}
            <div id="ticket-selector-slot" />
          </div>
        </div>

        {/* Description - Full Width Below */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-poppins)]">
            About This Event
          </h2>
          <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A]">
            <p className="text-[#F9FDFF]/80 leading-relaxed font-[family-name:var(--font-rubik)] whitespace-pre-line">
              {event.description}
            </p>
          </div>
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

        {/* NEW: Ticket Booster Section */}
        {!isCancelled && !isSoldOut && (
          <Card className={`border-2 bg-[#1A1A1A]/60 backdrop-blur-sm ${!isMember ? 'opacity-60' : 'border-[#59FFA0]/20 border-[#2A2A2A]'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#F9FDFF] font-[family-name:var(--font-poppins)] flex items-center gap-2">
                    Ticket Boosters
                    {!isMember && (
                      <Badge variant="outline" className="ml-2 border-[#59FFA0]/50 text-[#59FFA0]">
                        Members Only
                      </Badge>
                    )}
                  </h2>
                  <p className="text-sm text-[#F9FDFF]/60 mt-1 font-[family-name:var(--font-rubik)]">
                    {isMember 
                      ? 'Add special perks to enhance your experience'
                      : 'Become a member to unlock exclusive add-ons'
                    }
                  </p>
                </div>
              </div>

              {/* Boost Grid - 8 large icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableBoosts.map((boost) => {
                  const isDisabled = !isMember && boost.memberOnly
                  const isSelected = selectedBoosts.includes(boost.id)

                  return (
                    <button
                      key={boost.id}
                      onClick={() => toggleBoost(boost.id)}
                      disabled={isDisabled}
                      className={`
                        relative p-5 rounded-2xl border-2 transition-all text-center
                        ${isDisabled 
                          ? 'border-[#2A2A2A]/50 bg-[#1A1A1A]/20 cursor-not-allowed' 
                          : isSelected
                            ? 'border-[#59FFA0] bg-[#59FFA0]/10'
                            : 'border-[#2A2A2A] hover:border-[#59FFA0]/50 hover:bg-[#59FFA0]/5'
                        }
                      `}
                    >
                      {/* Large Icon - 64px */}
                      <div className={`
                        w-16 h-16 mx-auto mb-3 rounded-xl flex items-center justify-center text-4xl
                        ${isDisabled ? 'bg-[#2A2A2A]/30' : 'bg-[#59FFA0]/10'}
                      `}>
                        {boost.icon || '🎁'}
                      </div>

                      <h3 className={`font-semibold text-sm mb-1 font-[family-name:var(--font-rubik)] ${isDisabled ? 'text-[#F9FDFF]/30' : 'text-[#F9FDFF]'}`}>
                        {boost.name}
                      </h3>
                      
                      <p className={`text-xs mb-2 font-[family-name:var(--font-rubik)] ${isDisabled ? 'text-[#F9FDFF]/20' : 'text-[#F9FDFF]/60'}`}>
                        {boost.description}
                      </p>
                      
                      <p className={`text-lg font-bold font-[family-name:var(--font-playfair)] ${isDisabled ? 'text-[#F9FDFF]/30' : 'text-[#59FFA0]'}`}>
                        +${boost.price}
                      </p>

                      {boost.memberOnly && !isMember && (
                        <div className="absolute top-2 right-2">
                          <span className="text-sm">🔒</span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#59FFA0] flex items-center justify-center">
                          <span className="text-[#121113] text-xs font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {!isMember && (
                <div className="mt-6 text-center">
                  <button className="px-6 py-3 rounded-xl border-2 border-[#59FFA0]/50 text-[#59FFA0] hover:bg-[#59FFA0]/10 transition-all font-[family-name:var(--font-rubik)] font-medium">
                    Become a Member to Unlock Boosters
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Purchase Summary will be added by parent component */}
    </div>
  )
}