import { useEffect } from 'react'

export function Home() {
  useEffect(() => {
    document.title = 'RTNY - Home'
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to RTNY</h1>
      <p className="text-lg text-gray-600 mb-8">
        Your gateway to Rochester nightlife events and exclusive experiences.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Upcoming Events
          </h2>
          <p className="text-gray-600">
            Browse our selection of exclusive nightlife events in Rochester.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Membership Benefits
          </h2>
          <p className="text-gray-600">
            Enjoy exclusive perks and benefits with our tier-based membership system.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Sweepstakes
          </h2>
          <p className="text-gray-600">
            Enter to win exclusive prizes with every ticket purchase.
          </p>
        </div>
      </div>
    </div>
  )
}
