
import type { LucideProps } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Ticket, User, LogIn, Crown } from 'lucide-react'

interface NavigationProps {
  currentPage: string
  onNavigate: (page: string, eventId?: string) => void
  onShowAuth: () => void
  onShowProfile: () => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<LucideProps>
  show: boolean
}

export function Navigation({ 
  currentPage, 
  onNavigate, 
  onShowAuth, 
  onShowProfile 
}: NavigationProps) {
  const { user, hasPremiumAccess } = useAuth()

  const navItems: NavItem[] = [
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      show: true
    },
    {
      id: 'tickets',
      label: 'My Tickets',
      icon: Ticket,
      show: !!user
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      show: !!user
    }
  ]

  const renderMobileNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
      <div className="grid grid-cols-2 h-16">
        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label={`Go to ${item.label} page`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )

  const renderDesktopNav = () => (
    <nav className="hidden sm:block bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
                aria-label={`Go to ${item.label} page`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )

  const renderUserActions = () => (
    <div className="flex items-center space-x-4">
      {user ? (
        <button
          onClick={onShowProfile}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
          aria-label="Open profile"
        >
          {hasPremiumAccess() && (
            <Crown size={16} className="text-purple-600" />
          )}
          <User size={20} />
          <span className="hidden sm:block text-sm">
            {user.first_name || 'Profile'}
          </span>
        </button>
      ) : (
        <button
          onClick={onShowAuth}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          aria-label="Sign in to your account"
        >
          <LogIn size={16} />
          <span>Sign In</span>
        </button>
      )}
    </div>
  )

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">RTNY</h1>
              <span className="ml-2 text-sm text-gray-500">Tickets</span>
            </div>
            {renderUserActions()}
          </div>
        </div>
      </header>
      {renderDesktopNav()}
      {renderMobileNav()}
    </>
  )
}
