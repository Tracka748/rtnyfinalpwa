import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Input } from '../components/ui/Input'
import { User } from '../types'
import { Bell, Star, Gift, Trophy, ShieldCheck, CreditCard, Tag, Crown, Mail, Phone, LogOut, Calendar } from 'lucide-react'

interface UserProfileProps {
  user: {
    id: string
    email: string
    phone?: string
    first_name?: string
    last_name?: string
    preferences: {
      notifications_enabled: boolean
      marketing_emails: boolean
      guest_account: boolean
    }
    tier: 'free' | 'premium' | 'vip'
    total_spent: number
    total_purchases: number
    membership_expires_at?: string
  }
  onClose: () => void
}

interface PerkBenefit {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const perks: Record<'free' | 'premium' | 'vip', PerkBenefit[]> = {
  'free': [
    { icon: Bell, title: 'Event Notifications', description: 'Get notified about upcoming events' },
    { icon: Star, title: 'Member Discounts', description: 'Enjoy special member-only discounts' },
    { icon: Gift, title: 'Exclusive Perks', description: 'Access to member-exclusive events' }
  ],
  'premium': [
    { icon: ShieldCheck, title: 'Priority Access', description: 'Skip the lines at events' },
    { icon: CreditCard, title: 'VIP Discounts', description: 'Enjoy even more discounts' },
    { icon: Tag, title: 'Special Offers', description: 'Get exclusive offers and deals' }
  ],
  'vip': [
    { icon: Crown, title: 'VIP Lounge', description: 'Access to VIP lounges' },
    { icon: Star, title: 'Personal Concierge', description: 'Personal assistance at events' },
    { icon: Gift, title: 'VIP Perks', description: 'Exclusive VIP experiences' }
  ]
}

const renderPerks = (tier: 'free' | 'premium' | 'vip') => {
  return perks[tier]?.map((benefit: PerkBenefit, index: number) => (
    <div key={index} className="flex items-center gap-4 p-4">
      <benefit.icon className="h-6 w-6 text-primary" />
      <div>
        <h3 className="font-semibold">{benefit.title}</h3>
        <p className="text-sm text-gray-600">{benefit.description}</p>
      </div>
    </div>
  ))
}

export function UserProfile({ user, onClose }: UserProfileProps) {
  const { updateProfile, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notifications_enabled: user?.preferences?.notifications_enabled || false,
    marketing_emails: user?.preferences?.marketing_emails || false
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        preferences: {
          notifications_enabled: formData.notifications_enabled,
          marketing_emails: formData.marketing_emails
        }
      })
      setEditing(false)
      onClose()
    } catch (err) {
      setError('Failed to update profile. Please try again.')
    }
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user.first_name} {user.last_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} Member
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">Total Spent</span>
              </div>
              <p className="font-semibold">${user.total_spent.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600">Purchases</span>
              </div>
              <p className="font-semibold">{user.total_purchases}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Events Attended</span>
              </div>
              <p className="font-semibold">{user.total_purchases}</p>
            </div>
          </div>

          {/* Membership Benefits */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-white rounded-lg">
                <Crown className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} Membership</h3>
                <p className="text-sm text-gray-600">Expires {user.membership_expires_at ? new Date(user.membership_expires_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MEMBERSHIP_BENEFITS[user.tier].map((benefit, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <benefit.icon className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{benefit.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Full Name</span>
                </div>
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  name="first_name"
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
                <Input
                  type="text"
                  name="last_name"
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span>Email</span>
                </div>
              </label>
              <Input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span>Phone</span>
                </div>
              </label>
              <Input
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  <span>Notifications</span>
                </div>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="notifications_enabled"
                    checked={formData.notifications_enabled}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Receive notifications</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="marketing_emails"
                    checked={formData.marketing_emails}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Marketing emails</span>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                {error}
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div>
                <div className="flex justify-end gap-2">
                  {!editing ? (
                    <Button onClick={() => setEditing(true)} variant="outline">
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button type="button" onClick={() => setEditing(false)} variant="outline">
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to sign out?')) {
                      await signOut()
                      onClose()
                    }
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
