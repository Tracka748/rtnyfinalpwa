import { useState } from 'react'
import { Navigation } from './Navigation'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState('events')

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
    // Add your page navigation logic here
  }

  const handleShowAuth = () => {
    // Add your auth modal logic here
  }

  const handleShowProfile = () => {
    // Add your profile modal logic here
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onShowAuth={handleShowAuth}
        onShowProfile={handleShowProfile}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
