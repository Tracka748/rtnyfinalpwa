'use client'

// app/events/[id]/page.tsx
// FIXED: Now fetches real event data from Supabase with JSONB ticket_prices
// All cart/checkout functionality preserved
// UPDATED: Next.js 15 params handling with React.use()

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Info,
  Sparkles,
  ChevronRight,
  ShoppingCart,
  Minus,
  Plus,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { ShareButton } from '@/components/custom/events/share-button'
import { format } from 'date-fns'

// Types matching your actual database schema
interface TicketType {
  id: string
  name: string
  description: string
  price: number
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
  featured: boolean
  total_tickets: number
  tickets_sold: number
  ticket_types: TicketType[]
}

interface CartItem {
  ticketTypeId: string
  quantity: number
  price: number
  name: string
}

// ============================================
// HELPER FUNCTION: Convert JSONB to TicketType[]
// ============================================
function convertTicketPricesToTypes(
  ticketPrices: Record<string, number> | null,
  totalTickets: number,
  ticketsSold: number
): TicketType[] {
  if (!ticketPrices || typeof ticketPrices !== 'object') {
    // Fallback if no ticket_prices defined
    return [{
      id: 'general',
      name: 'General Admission',
      description: 'Standard entry to the event',
      price: 25.00,
      quantity: totalTickets,
      remaining: Math.max(0, totalTickets - ticketsSold)
    }]
  }

  // Convert JSONB object to array of ticket types
  return Object.entries(ticketPrices).map(([tierName, price]) => {
    // Estimate remaining based on tier (simple split for now)
    const estimatedRemaining = Math.floor((totalTickets - ticketsSold) / Object.keys(ticketPrices).length)

    return {
      id: tierName.toLowerCase().replace(/\s+/g, '_'),
      name: tierName.charAt(0).toUpperCase() + tierName.slice(1), // Capitalize
      description: `${tierName.charAt(0).toUpperCase() + tierName.slice(1)} admission`,
      price: Number(price),
      quantity: totalTickets,
      remaining: Math.max(0, estimatedRemaining)
    }
  })
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Unwrap the params Promise (Next.js 15 requirement)
  const { id } = use(params)
  
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({}) // ticketTypeId -> quantity
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // FETCH REAL EVENT DATA FROM SUPABASE
  // ============================================
  useEffect(() => {
    async function fetchEvent() {
      try {
        setIsLoading(true)
        setError(null)

        // Validate UUID format before querying — Postgres throws 22P02 on non-UUID ids
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
          throw new Error('Event not found')
        }

        const supabase = createBrowserSupabaseClient()

        // Fetch event with venue relationship and ticket types
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            id,
            name,
            description,
            event_date,
            flyer_image_url,
            category,
            status,
            featured,
            total_tickets,
            tickets_sold,
            ticket_prices,
            tier_discounts,
            venue_id,
            venues (
              name,
              address
            ),
            ticket_types (
              id,
              name,
              description,
              price,
              quantity,
              remaining
            )
          `)
          .eq('id', id)
          .single()

        console.log('Supabase response:', { eventData, eventError, id })

        if (eventError) {
          console.error('Supabase error code:', eventError.code)
          console.error('Supabase error message:', eventError.message)
          console.error('Supabase error hint:', eventError.hint)
          console.error('Supabase error details:', eventError.details)
          throw new Error(`Supabase error: ${eventError.code} - ${eventError.message} - ${eventError.hint}`)
        }
        if (!eventData) throw new Error('Event not found')

        // Convert database format to UI format
        // Note: venues is an array from the relationship, but we only need the first item
        const venue = eventData.venues as { name: string; address: string } | null

        // Use actual ticket_types from database if available, otherwise fall back to derived types
        const rawTicketTypes = eventData.ticket_types as unknown
        const ticketTypesArray = Array.isArray(rawTicketTypes) ? rawTicketTypes : []

        const ticketTypes: TicketType[] = ticketTypesArray.length > 0
          ? ticketTypesArray.map((tt: any) => ({
              id: tt.id, // Use the actual UUID from database
              name: tt.name,
              description: tt.description || `${tt.name} admission`,
              price: Number(tt.price),
              quantity: tt.quantity,
              remaining: tt.remaining
            }))
          : convertTicketPricesToTypes(
              eventData.ticket_prices as Record<string, number> | null,
              eventData.total_tickets || 500,
              eventData.tickets_sold || 0
            )

        console.log('Ticket types with IDs:', ticketTypes)

        const formattedEvent: Event = {
          id: eventData.id,
          name: eventData.name,
          description: eventData.description || 'No description available',
          event_date: eventData.event_date,
          venue_name: venue?.name || 'Venue TBA',
          venue_address: venue?.address || 'Address TBA',
          flyer_image_url: eventData.flyer_image_url,
          category: eventData.category || 'Event',
          status: eventData.status,
          featured: eventData.featured || false,
          total_tickets: eventData.total_tickets || 500,
          tickets_sold: eventData.tickets_sold || 0,
          ticket_types: ticketTypes
        }

        setEvent(formattedEvent)
      } catch (err) {
        console.error('Error fetching event:', err)
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59FFA0] mx-auto mb-4"></div>
          <p className="font-sans text-[#F9FDFF]/60">Loading event details...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center p-4">
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="font-header text-xl text-[#F9FDFF]">
                Event Not Found
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-[#F9FDFF]/80 mb-4">
              {error || 'This event could not be found or may no longer be available.'}
            </p>
            <Button 
              onClick={() => router.push('/events')}
              className="w-full bg-[#59FFA0] hover:bg-[#59FFA0]/90 text-[#121113]"
            >
              Browse All Events
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // CART CALCULATIONS (Unchanged)
  // ============================================
  const cartItems = Object.entries(cart).filter(([_, qty]) => qty > 0)
  const totalTickets = cartItems.reduce((sum, [_, qty]) => sum + qty, 0)
  const subtotal = cartItems.reduce((sum, [ticketTypeId, qty]) => {
    const ticketType = event.ticket_types.find(t => t.id === ticketTypeId)
    return sum + (ticketType?.price || 0) * qty
  }, 0)

  // Update quantity (Unchanged)
  const updateQuantity = (ticketTypeId: string, change: number) => {
    const ticketType = event.ticket_types.find(t => t.id === ticketTypeId)
    if (!ticketType) return

    const currentQty = cart[ticketTypeId] || 0
    const newQty = Math.max(0, Math.min(currentQty + change, ticketType.remaining))
    
    setCart(prev => ({
      ...prev,
      [ticketTypeId]: newQty
    }))
  }

  // Proceed to checkout
  const handleCheckout = () => {
    if (totalTickets === 0) return

    // Build cart data
    const cartData = cartItems.map(([ticketTypeId, quantity]) => {
      const ticketType = event.ticket_types.find(t => t.id === ticketTypeId)!
      console.log('Building cart item:', {
        ticketTypeId,
        ticketTypeName: ticketType.name,
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketTypeId)
      })
      return {
        ticketTypeId, // This should be a UUID from database
        quantity,
        price: ticketType.price,
        name: ticketType.name
      }
    })

    // Store in sessionStorage and navigate to checkout
    const checkoutData = {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.event_date,
      items: cartData,
      subtotal
    }

    console.log('Storing checkout cart:', checkoutData)
    sessionStorage.setItem('checkout_cart', JSON.stringify(checkoutData))

    router.push(`/checkout?eventId=${event.id}`)
  }

  // ============================================
  // MAIN UI (All existing functionality preserved)
  // ============================================
  return (
    <div className="min-h-screen bg-[#121113]">
      {/* Hero Image */}
      <div className="relative w-full h-[40vh] md:h-[50vh]">
        {/* Background Image or Gradient */}
        {event.flyer_image_url ? (
          <Image
            src={event.flyer_image_url}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#59FFA0]/20 to-[#1AC8ED]/20" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121113]/50 to-[#121113]" />
        
        {/* Event Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Badge className="mb-3 bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90 font-label">
              {event.category}
            </Badge>
            <h1 className="font-slab-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#F9FDFF] mb-2">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[#F9FDFF]/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="font-sans">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-sans">
                  {new Date(event.event_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ABOUT THIS EVENT */}
            <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#59FFA0]" />
                  <CardTitle className="font-header text-2xl text-[#F9FDFF]">
                    About This Event
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-[#F9FDFF]/80 leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* TICKET SELECTION - PROMINENT & FUNCTIONAL */}
            <Card className="bg-gradient-to-br from-[#59FFA0]/10 via-[#1AC8ED]/5 to-transparent border-2 border-[#59FFA0]/30 shadow-lg shadow-[#59FFA0]/10">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#59FFA0]/20">
                      <Sparkles className="h-6 w-6 text-[#59FFA0]" />
                    </div>
                    <div>
                      <CardTitle className="font-header text-3xl text-[#F9FDFF] mb-1">
                        Select Tickets
                      </CardTitle>
                      <CardDescription className="font-sans text-[#F9FDFF]/60">
                        Choose your ticket type and quantity
                      </CardDescription>
                    </div>
                  </div>
                  {totalTickets > 0 && (
                    <Badge className="bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90 font-label text-lg px-4 py-2">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {event.ticket_types.map((ticket) => {
                  const quantity = cart[ticket.id] || 0
                  const itemTotal = quantity * ticket.price

                  return (
                    <div
                      key={ticket.id}
                      className={`group relative bg-[#121113] border-2 rounded-xl p-6 transition-all duration-300 ${
                        quantity > 0 
                          ? 'border-[#59FFA0] shadow-lg shadow-[#59FFA0]/20' 
                          : 'border-[#2A2A2A] hover:border-[#59FFA0]/50 hover:shadow-lg hover:shadow-[#59FFA0]/10'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Ticket Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-slab-serif text-2xl font-bold transition-colors ${
                              quantity > 0 ? 'text-[#59FFA0]' : 'text-[#F9FDFF] group-hover:text-[#59FFA0]'
                            }`}>
                              {ticket.name}
                            </h3>
                            {ticket.remaining < 20 && (
                              <Badge variant="destructive" className="font-label text-xs">
                                Only {ticket.remaining} left!
                              </Badge>
                            )}
                          </div>
                          <p className="font-sans text-sm text-[#F9FDFF]/60 mb-3">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <p className="font-sans text-xs text-[#F9FDFF]/40">
                              {ticket.remaining} remaining
                            </p>
                            {quantity > 0 && (
                              <p className="font-sans text-sm text-[#59FFA0] font-semibold">
                                × {quantity} = ${itemTotal.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Price & Quantity Selector */}
                        <div className="flex flex-col items-end gap-4 w-full sm:w-auto">
                          {/* Price */}
                          <div className="text-right">
                            <p className="font-serif text-4xl font-bold text-[#59FFA0]">
                              ${ticket.price.toFixed(2)}
                            </p>
                            <p className="font-sans text-xs text-[#F9FDFF]/40">
                              per ticket
                            </p>
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-lg p-2 border border-[#2A2A2A]">
                            <button 
                              onClick={() => updateQuantity(ticket.id, -1)}
                              disabled={quantity === 0}
                              className="h-10 w-10 rounded-lg bg-[#2A2A2A] hover:bg-[#59FFA0] text-[#F9FDFF] hover:text-[#121113] transition-all duration-200 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2A2A2A] disabled:hover:text-[#F9FDFF]"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-5 w-5" />
                            </button>
                            <span className="font-sans text-2xl font-bold text-[#F9FDFF] w-12 text-center">
                              {quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(ticket.id, 1)}
                              disabled={quantity >= ticket.remaining}
                              className="h-10 w-10 rounded-lg bg-[#2A2A2A] hover:bg-[#59FFA0] text-[#F9FDFF] hover:text-[#121113] transition-all duration-200 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2A2A2A] disabled:hover:text-[#F9FDFF]"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="my-6 h-px bg-[#2A2A2A]" />

                {/* Total & Checkout Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-sans text-sm text-[#F9FDFF]/60 mb-1">
                      Total ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})
                    </p>
                    <p className="font-serif text-4xl font-bold text-[#59FFA0]">
                      ${subtotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button
                      size="lg"
                      onClick={handleCheckout}
                      disabled={totalTickets === 0}
                      className="flex-1 bg-[#59FFA0] hover:bg-[#59FFA0]/90 text-[#121113] font-semibold text-lg px-8 py-6 rounded-xl group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{totalTickets === 0 ? 'Select Tickets' : 'Proceed to Checkout'}</span>
                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <ShareButton
                      eventId={event.id}
                      eventName={event.name}
                      eventDate={format(new Date(event.event_date), 'MMMM d, yyyy')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Event Details */}
          <div className="lg:col-span-1">
            <Card className="bg-[#1A1A1A] border-[#2A2A2A] sticky top-8">
              <CardHeader>
                <CardTitle className="font-header text-xl text-[#F9FDFF]">
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#59FFA0]/10">
                    <Calendar className="h-5 w-5 text-[#59FFA0]" />
                  </div>
                  <div>
                    <p className="font-label text-xs text-[#F9FDFF]/60 uppercase tracking-wider mb-1">
                      Date
                    </p>
                    <p className="font-sans text-sm text-[#F9FDFF]">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#1AC8ED]/10">
                    <Clock className="h-5 w-5 text-[#1AC8ED]" />
                  </div>
                  <div>
                    <p className="font-label text-xs text-[#F9FDFF]/60 uppercase tracking-wider mb-1">
                      Time
                    </p>
                    <p className="font-sans text-sm text-[#F9FDFF]">
                      {new Date(event.event_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#2A2A2A]" />

                {/* Location */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#59FFA0]/10">
                    <MapPin className="h-5 w-5 text-[#59FFA0]" />
                  </div>
                  <div>
                    <p className="font-label text-xs text-[#F9FDFF]/60 uppercase tracking-wider mb-1">
                      Location
                    </p>
                    <p className="font-sans text-sm text-[#F9FDFF] font-semibold">
                      {event.venue_name}
                    </p>
                    <p className="font-sans text-xs text-[#F9FDFF]/60 mt-1">
                      {event.venue_address}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#2A2A2A]" />

                {/* Capacity */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#1AC8ED]/10">
                    <Users className="h-5 w-5 text-[#1AC8ED]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-label text-xs text-[#F9FDFF]/60 uppercase tracking-wider mb-1">
                      Attendance
                    </p>
                    <p className="font-sans text-sm text-[#F9FDFF] mb-2">
                      {event.tickets_sold} / {event.total_tickets} attending
                    </p>
                    <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(event.tickets_sold / event.total_tickets) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}