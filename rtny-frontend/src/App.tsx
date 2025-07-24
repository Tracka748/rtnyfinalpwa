import React, { useState } from 'react'
import { Navigation } from './components/layout/Navigation'
import { AuthModal } from './components/auth/AuthModal'
import { UserProfile } from './components/auth/UserProfile'
import { EventsList } from './components/events/EventsList'
import { EventDetails } from './components/events/EventDetails'
import { UserTickets } from './components/tickets/UserTickets'

type Page = 'events' | 'event-details' | 'tickets'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('events')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const handleNavigate = (page: Page, eventId?: string) => {
    setCurrentPage(page)
    if (eventId) setSelectedEventId(eventId)
  }

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId)
    setCurrentPage('event-details')
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'events':
        return <EventsList onEventSelect={handleEventSelect} />
      case 'event-details':
        return selectedEventId ? (
          <EventDetails 
            eventId={selectedEventId} 
            onBack={() => setCurrentPage('events')}
          />
        ) : (
          <EventsList onEventSelect={handleEventSelect} />
        )
      case 'tickets':
        return <UserTickets />
      default:
        return <EventsList onEventSelect={handleEventSelect} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onShowAuth={() => setShowAuthModal(true)}
        onShowProfile={() => setShowProfileModal(true)}
      />
      
      <main className="pb-16 sm:pb-0">
        {renderCurrentPage()}
      </main>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {showProfileModal && (
        <UserProfile onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  )
}

export default App
