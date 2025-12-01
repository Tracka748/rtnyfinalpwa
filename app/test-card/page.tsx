'use client'
import { EventCard } from '@/components/custom/events/event-card'

const testEvent = {
  id: '1',
  name: 'Saturday Night Live Music',
  description: 'Live bands featuring local Rochester artists',
  venue_name: 'The Montage Music Hall',
  venue_address: '50 Chestnut St, Rochester, NY 14604',
  event_date: '2024-12-21T21:00:00Z',
  flyer_image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  category: 'Live Music',
  min_price: 25,
  max_price: 25,
  status: 'active' as const,
  featured: false
}

const featuredEvent = {
  id: '2',
  name: 'Friday Night Dance Party',
  description: 'Top 40 hits and dance classics',
  venue_name: 'Club Vinyl',
  venue_address: '1 South Clinton Ave, Rochester, NY',
  event_date: '2024-12-20T22:00:00Z',
  flyer_image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
  category: 'Nightclub',
  min_price: 15,
  max_price: 20,
  status: 'active' as const,
  featured: true
}

export default function TestCardPage() {
  return (
    <div className="min-h-screen bg-[#121113] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-3xl font-bold mb-8 text-center">
          Event Card Test
        </h1>

        {/* Featured Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-white text-xl mb-4">Featured Event</h2>
          <EventCard 
            event={featuredEvent} 
            featured={true}
            onClick={() => alert('Featured event clicked!')} 
          />
        </div>

        {/* Regular Cards Grid */}
        <div className="space-y-8">
          <h2 className="text-white text-xl">Regular Event Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EventCard 
              event={testEvent} 
              onClick={() => alert('Event 1 clicked!')} 
            />
            <EventCard 
              event={{...testEvent, id: '3', name: 'Hip-Hop Showcase'}} 
              onClick={() => alert('Event 2 clicked!')} 
            />
            <EventCard 
              event={{...testEvent, id: '4', name: 'Electronic Night', status: 'sold_out' as const}} 
              onClick={() => alert('Event 3 clicked!')} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
