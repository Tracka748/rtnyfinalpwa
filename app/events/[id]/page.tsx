"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { MapPin, Loader2 } from "lucide-react"
import { AppNav } from "@/components/custom/layout/app-nav"
import { TicketSelector } from "@/components/custom/events/ticket-selector"
import { PurchaseSummary } from "@/components/custom/events/purchase-summary"

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

  // Handle back navigation
  const handleBack = () => {
    router.push('/events')
  }

  // Handle share
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

  // Update quantity handler for TicketSelector
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

  // Calculate totals
  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  
  const totalPrice = event?.ticket_types.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0
    return sum + ticket.price * qty
  }, 0) || 0

  // Handle purchase/checkout
  const handlePurchase = async () => {
    if (!event || totalQuantity === 0) return

    setIsProcessing(true)

    try {
      const ticketSelections = Object.entries(quantities)
        .filter(([_, quantity]) => quantity > 0)
        .map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity
        }))

      // Navigate to checkout with params
      const searchParams = new URLSearchParams({
        eventId: event.id,
        tickets: JSON.stringify(ticketSelections)
      })
      
      router.push(`/checkout?${searchParams.toString()}`)
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to proceed to checkout')
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#59FFA0]" />
      </div>
    )
  }

  // Error state
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
      <div className="max-w-4xl mx-auto px-6 -mt-32 relative z-10 space-y-8">
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

        {/* Description */}
        {event.description && (
          <div className="p-6 rounded-2xl bg-[#1A1A1A]/60 backdrop-blur-sm border border-[#2A2A2A]">
            <p className="text-[#F9FDFF]/80 font-[family-name:var(--font-rubik)] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* Ticket Selector */}
        {event.ticket_types && event.ticket_types.length > 0 && (
          <TicketSelector
            ticketTypes={event.ticket_types}
            quantities={quantities}
            onQuantityChange={updateQuantity}
          />
        )}
      </div>

      {/* Purchase Summary - Floating Bottom Bar (Always Visible) */}
      <PurchaseSummary
        totalQuantity={totalQuantity}
        totalPrice={totalPrice}
        onPurchase={handlePurchase}
        disabled={isProcessing}
      />
    </div>
  )
}