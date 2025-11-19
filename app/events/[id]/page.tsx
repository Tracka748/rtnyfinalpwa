"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { MapPin, Loader2, Calendar, Clock, Users, Music } from "lucide-react"
import { AppNav } from "@/components/custom/layout/app-nav"
import { TicketSelector } from "@/components/custom/events/ticket-selector"
import { PurchaseSummary } from "@/components/custom/events/purchase-summary"
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

interface Event {
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

interface BoostSlot {
  id: string
  name: string
  description: string
  price: number
  icon?: string
  memberOnly: boolean
}

export default function EventDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter()
  const [eventId, setEventId] = useState<string | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([])
  const isMember = false // TODO: Get from auth context

  // Sample boost data
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

  // Unwrap params
  useEffect(() => {
    params.then(p => setEventId(p.id))
  }, [params])

  // Fetch event data
  useEffect(() => {
    if (!eventId) return

    async function fetchEvent() {
      try {
        setLoading(true)
        const response = await fetch(`/api/v1/events/${eventId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound()
          }
          throw new Error('Failed to fetch event')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setEvent(result.data)
        } else {
          throw new Error('Invalid response')
        }
      } catch (err: any) {
        console.error('Error fetching event:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const handleBack = () => router.push('/events')
  
  const handleShare = async () => {
    if (!event) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Check out ${event.name}!`,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const updateQuantity = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[ticketId] || 0
      const newValue = Math.max(0, current + delta)
      
      if (newValue === 0) {
        const { [ticketId]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [ticketId]: newValue }
    })
  }

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

  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  
  const totalPrice = (event?.ticket_types.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0
    return sum + ticket.price * qty
  }, 0) || 0) + selectedBoosts.reduce((sum, boostId) => {
    const boost = availableBoosts.find(b => b.id === boostId)
    return sum + (boost?.price || 0)
  }, 0)

  const handlePurchase = async () => {
    if (!event || totalQuantity === 0) return
    setIsProcessing(true)

    try {
      const ticketSelections = Object.entries(quantities)
        .filter(([_, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))

      const searchParams = new URLSearchParams({
        eventId: event.id,
        tickets: JSON.stringify(ticketSelections),
        boosts: selectedBoosts.join(',')
      })
      
      router.push(`/checkout?${searchParams.toString()}`)
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to proceed to checkout')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#59FFA0]" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Event not found'}</p>
          <button 
            onClick={handleBack}
            className="text-[#59FFA0] hover:underline"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113] text-[#F9FDFF] pb-32">
      {/* App Navigation */}
      <AppNav 
        showBack 
        onBack={handleBack} 
        showShare
        onShare={handleShare}
      />

      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        {event.flyer_image_url ? (
          <img
            src={event.flyer_image_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#121113]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121113] via-[#121113]/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-10 space-y-8">
        {/* Event Header */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F9FDFF] font-[family-name:var(--font-rokkitt)]">
            {event.name}
          </h1>
          
          <div className="flex items-center gap-2 text-[#F9FDFF]/80">
            <MapPin className="h-5 w-5" />
            <span className="font-[family-name:var(--font-rubik)]">
              {event.venue_name}
            </span>
          </div>

          <div className="text-[#F9FDFF]/60 font-[family-name:var(--font-rubik)]">
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </div>
        </div>

        {/* SWAPPED: Two-Column Layout - Tickets LEFT, Event Details RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Ticket Selector - Main Vision Area */}
          <div>
            {event.ticket_types && event.ticket_types.length > 0 && (
              <TicketSelector
                ticketTypes={event.ticket_types}
                quantities={quantities}
                onQuantityChange={updateQuantity}
              />
            )}
          </div>

          {/* RIGHT: Event Detail Highlights */}
          <Card className="border-2 border-[#59FFA0]/20 bg-[#1A1A1A]/60 backdrop-blur-sm">
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
                      {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Time */}
                {(event.start_time || event.end_time) && (
                  <div className="flex items-start gap-4">
                    <Clock className="h-6 w-6 text-[#59FFA0] flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-1 font-[family-name:var(--font-montserrat)]">
                        Time
                      </p>
                      <p className="text-[#F9FDFF] text-lg font-medium font-[family-name:var(--font-rubik)]">
                        {event.start_time || format(new Date(event.event_date), "h:mm a")}
                        {event.end_time && ` - ${event.end_time}`}
                      </p>
                    </div>
                  </div>
                )}

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
                  <p className="text-[#F9FDFF]/60 text-xs uppercase tracking-wider mb-2 font-[family-name:var(--font-montserrat)]">
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
            </CardContent>
          </Card>
        </div>

        {/* Description - Full Width Below */}
        {event.description && (
          <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold mb-4 text-[#F9FDFF] font-[family-name:var(--font-poppins)]">
              About This Event
            </h2>
            <p className="text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* Ticket Booster Section - 64px icons (w-16 h-16) */}
        <Card className={`border-2 bg-[#1A1A1A]/60 backdrop-blur-sm ${!isMember ? 'opacity-60' : 'border-[#59FFA0]/20'}`}>
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

            {/* Boost Grid - 64px icons */}
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
                    {/* 64px Icon (w-16 h-16) */}
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
      </div>

      {/* Purchase Summary */}
      <PurchaseSummary
        totalQuantity={totalQuantity}
        totalPrice={totalPrice}
        onPurchase={handlePurchase}
        disabled={isProcessing}
      />
    </div>
  )
}