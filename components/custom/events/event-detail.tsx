"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface TicketType {
  id: string
  name: string
  price: number
  description?: string
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

interface TicketSelection {
  ticketTypeId: string
  quantity: number
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
  const [selections, setSelections] = useState<Record<string, number>>({})
  const [isValidating, setIsValidating] = useState(false)

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

  // Update ticket quantity
  const updateQuantity = (ticketTypeId: string, delta: number) => {
    setSelections(prev => {
      const current = prev[ticketTypeId] || 0
      const newQuantity = Math.max(0, current + delta)
      
      if (newQuantity === 0) {
        const { [ticketTypeId]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [ticketTypeId]: newQuantity }
    })
  }

  // Calculate totals
  const totalQuantity = Object.values(selections).reduce((sum, qty) => sum + qty, 0)
  
  const totalPrice = event?.ticket_types?.reduce((sum, type) => {
    const quantity = selections[type.id] || 0
    return sum + (type.price * quantity)
  }, 0) || 0

  // Handle checkout
  const handleProceedToCheckout = async () => {
    if (!event || totalQuantity === 0) return

    setIsValidating(true)

    try {
      const ticketSelections: TicketSelection[] = Object.entries(selections)
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
      setIsValidating(false)
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
          <Button onClick={() => router.push('/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  // Format date
  const eventDate = new Date(event.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <main className="min-h-screen bg-[#121113] pb-32">
      {/* Back Button */}
      <div className="sticky top-0 z-20 bg-[#121113]/95 backdrop-blur-lg border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/events')}
            className="flex items-center gap-2 text-[#A0A0A0] transition-colors hover:text-[#59FFA0]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-[family-name:var(--font-rubik)]">Back to Events</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Event Image */}
        {event.flyer_image_url && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-8">
            <Image
              src={event.flyer_image_url}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Event Info */}
        <div className="mb-8">
          <div className="mb-4">
            <span className="inline-block rounded-full bg-[#59FFA0]/10 px-3 py-1 text-sm font-[family-name:var(--font-montserrat)] text-[#59FFA0]">
              {event.category}
            </span>
          </div>

          <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF] md:text-5xl mb-4">
            {event.name}
          </h1>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 text-[#A0A0A0]">
              <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-[family-name:var(--font-rubik)]">{formattedDate}</p>
                <p className="font-[family-name:var(--font-rubik)] text-sm">{formattedTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-[#A0A0A0]">
              <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-[family-name:var(--font-rubik)]">{event.venue_name}</p>
                <p className="font-[family-name:var(--font-rubik)] text-sm">{event.venue_address}</p>
              </div>
            </div>
          </div>

          <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0] leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>

        {/* Ticket Selector */}
        {event.ticket_types && Array.isArray(event.ticket_types) && event.ticket_types.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-rokkitt)] text-2xl font-bold text-[#F9FDFF] mb-6">
              Select Tickets
            </h2>

            <div className="space-y-4">
              {event.ticket_types.map(type => (
                <div 
                  key={type.id}
                  className="flex items-center justify-between p-4 border border-[#2A2A2A] rounded-lg bg-[#1a1a1a]"
                >
                  <div className="flex-1">
                    <h3 className="font-[family-name:var(--font-poppins)] text-lg text-[#F9FDFF]">
                      {type.name}
                    </h3>
                    {type.description && (
                      <p className="text-sm text-[#A0A0A0] mt-1">{type.description}</p>
                    )}
                    <p className="font-[family-name:var(--font-playfair)] text-[#59FFA0] mt-2 text-xl">
                      ${type.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(type.id, -1)}
                      disabled={(selections[type.id] || 0) === 0}
                      className="h-9 w-9 border-[#2A2A2A]"
                    >
                      <span className="text-lg">−</span>
                    </Button>

                    <span className="w-8 text-center font-[family-name:var(--font-montserrat)] text-[#F9FDFF]">
                      {selections[type.id] || 0}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(type.id, 1)}
                      className="h-9 w-9 border-[#2A2A2A]"
                    >
                      <span className="text-lg">+</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No Tickets Available */}
        {(!event.ticket_types || !Array.isArray(event.ticket_types) || event.ticket_types.length === 0) && (
          <div className="text-center py-12 bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg">
            <p className="text-[#A0A0A0] font-[family-name:var(--font-rubik)]">
              Tickets are not yet available for this event.
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Toolbar */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#A0A0A0]">
                  Total ({totalQuantity} {totalQuantity === 1 ? 'ticket' : 'tickets'})
                </p>
                <p className="font-[family-name:var(--font-playfair)] text-2xl text-[#59FFA0]">
                  ${totalPrice.toFixed(2)}
                </p>
              </div>

              <Button
                onClick={handleProceedToCheckout}
                disabled={isValidating}
                className="bg-[#59FFA0] hover:bg-[#4DE08A] text-[#121113] font-[family-name:var(--font-montserrat)] px-8 py-6 text-lg"
                size="lg"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Select Tickets'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}