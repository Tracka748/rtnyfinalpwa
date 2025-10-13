"use client"

import { use } from "react"
import { EventDetail } from "@/components/custom/events/event-detail"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import type { EventWithTickets } from "@/types/event"

const sampleEvents: EventWithTickets[] = [
  {
    id: "1",
    name: "Saturday Night Fever",
    description: "Experience the best house and techno beats with DJ Apex. Join us for an unforgettable night of electronic music in Rochester's premier music venue.",
    event_date: "2025-01-18T22:00:00Z",
    venue_name: "The Montage Music Hall",
    venue_address: "50 Chestnut St, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/1200x800/1a1a1a/59FFA0?text=Saturday+Night+Fever&font=roboto",
    category: "Electronic",
    min_price: 25,
    max_price: 45,
    status: "active",
    featured: true,
    tickets_available: 150,
    ticketTypes: [
      {
        id: "1-general",
        name: "General Admission",
        price: 25,
        quantity: 100,
        remaining: 75,
      },
      {
        id: "1-vip",
        name: "VIP Entry",
        price: 45,
        quantity: 50,
        remaining: 20,
      },
    ],
  },
  {
    id: "2",
    name: "Jazz & Cocktails Night",
    description: "Smooth jazz with craft cocktails and tapas. Featuring live performances from Rochester's finest jazz musicians.",
    event_date: "2025-01-20T20:00:00Z",
    venue_name: "Anthology",
    venue_address: "336 East Ave, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/1200x800/1a1a1a/1AC8ED?text=Jazz+%26+Cocktails&font=roboto",
    category: "Jazz",
    min_price: 35,
    max_price: 60,
    status: "active",
    featured: false,
    tickets_available: 80,
    ticketTypes: [
      {
        id: "2-standard",
        name: "Standard Seating",
        price: 35,
        quantity: 60,
        remaining: 45,
      },
      {
        id: "2-premium",
        name: "Premium Table",
        price: 60,
        quantity: 20,
        remaining: 10,
      },
    ],
  },
  {
    id: "5",
    name: "Hip-Hop Takeover",
    description: "The hottest hip-hop tracks all night long with special guest DJs from NYC and Toronto.",
    event_date: "2025-01-25T22:00:00Z",
    venue_name: "The Montage Music Hall",
    venue_address: "50 Chestnut St, Rochester, NY 14604",
    flyer_image_url: "https://placehold.co/1200x800/1a1a1a/9D4EDD?text=Hip-Hop+Takeover&font=roboto",
    category: "Hip-Hop",
    min_price: 20,
    max_price: 40,
    status: "active",
    featured: true,
    tickets_available: 200,
    ticketTypes: [
      {
        id: "5-general",
        name: "General Admission",
        price: 20,
        quantity: 150,
        remaining: 120,
      },
      {
        id: "5-vip",
        name: "VIP + Meet & Greet",
        price: 40,
        quantity: 50,
        remaining: 35,
      },
    ],
  },
]

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)  // ← Use React.use() to unwrap the Promise
  const event = sampleEvents.find((e) => e.id === id)

  if (!event) {
    notFound()
  }

  const handlePurchase = (selections: Array<{ ticketTypeId: string; quantity: number }>) => {
    console.log("Purchase:", selections)
    alert(`Purchasing ${selections.reduce((sum, s) => sum + s.quantity, 0)} ticket(s)!`)
  }

  const handleBack = () => {
    router.push("/events")
  }

  return <EventDetail event={event} onPurchase={handlePurchase} onBack={handleBack} />
}