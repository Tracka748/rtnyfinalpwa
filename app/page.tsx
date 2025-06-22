import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ROCticketNy
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your gateway to Rochester nightlife events and exclusive experiences
        </p>
        
        <div className="space-x-4">
          <Button asChild>
            <Link href="/events">Browse Events</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/membership">Join Membership</Link>
          </Button>
        </div>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Exclusive Events</h3>
          <p className="text-gray-600">Access to Hottest nightlife events in Rochester</p>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Tier Benefits</h3>
          <p className="text-gray-600">Unlock perks and discounts with membership tiers</p>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Win Big</h3>
          <p className="text-gray-600">Every ticket purchase enters you in sweepstakes</p>
        </div>
      </div>
    </div>
  )
}
