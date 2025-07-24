import { createContext, useContext, useEffect, useState } from 'react'
import { createClient, Session } from '@supabase/supabase-js'
import { formatPhoneNumber } from '../lib/phoneUtils'

const supabaseUrl = 'https://uxpmfnbifhkayljayjtb.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Define our database types
interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          first_name: string | null
          last_name: string | null
          tier: 'free' | 'premium' | 'vip'
          membership_status: 'active' | 'inactive' | 'suspended'
          membership_expires_at: string | null
          total_spent: number
          total_purchases: number
          referral_code: string | null
          referred_by: string | null
          profile_image_url: string | null
          preferences: {
            notifications_enabled: boolean
            marketing_emails: boolean
            guest_account: boolean
          }
          created_at: string
          updated_at: string
        }
      }
    }
  }
}

// User profile interface
interface UserProfile {
  id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  tier: 'free' | 'premium' | 'vip'
  membership_status: 'active' | 'inactive' | 'suspended'
  membership_expires_at?: string
  total_spent: number
  total_purchases: number
  referral_code?: string
  referred_by?: string
  profile_image_url?: string
  preferences: {
    notifications_enabled: boolean
    marketing_emails: boolean
    guest_account: boolean
  }
  created_at: string
  updated_at: string
}

// Type assertion for Supabase auth data
interface AuthResponse {
  data: {
    session: Session | null
  }
  error: any
}

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string) => Promise<void>
  signInWithPhone: (phone: string) => Promise<void>
  verifyOtp: (emailOrPhone: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  createGuestProfile: (email?: string, phone?: string, firstName?: string, lastName?: string) => Promise<void>
  hasPremiumAccess: () => boolean
  hasVipAccess: () => boolean
  isMembershipActive: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) {
        throw new Error('No user profile found')
      }
      
      // Convert Supabase row type to UserProfile
      const profile: UserProfile = {
        id: data.id,
        email: data.email || '',
        phone: data.phone || undefined,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        tier: data.tier,
        membership_status: data.membership_status,
        membership_expires_at: data.membership_expires_at || undefined,
        total_spent: data.total_spent,
        total_purchases: data.total_purchases,
        referral_code: data.referral_code || undefined,
        referred_by: data.referred_by || undefined,
        profile_image_url: data.profile_image_url || undefined,
        preferences: data.preferences,
        created_at: data.created_at,
        updated_at: data.updated_at
      }

      setUser(profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to fetch user profile')
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
      setError('Failed to send sign-in link')
    }
  }

  const signInWithPhone = async (phone: string) => {
    try {
      const formattedPhone = formatPhoneNumber(phone)
      if (!formattedPhone) {
        throw new Error('Invalid phone number format')
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
      setError('Failed to send sign-in code')
    }
  }

  const verifyOtp = async (emailOrPhone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: emailOrPhone.includes('@') ? 'magiclink' : 'sms',
        email: emailOrPhone.includes('@') ? emailOrPhone : null,
        phone: emailOrPhone.includes('@') ? null : emailOrPhone
      })

      if (error) throw error
    } catch (error) {
      console.error('Error verifying OTP:', error)
      setError('Invalid verification code')
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Failed to sign out')
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error
      setUser(prev => prev ? { ...prev, ...updates } : null)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    }
  }

  const createGuestProfile = async (email?: string, phone?: string, firstName?: string, lastName?: string) => {
    try {
      if (!email && !phone) {
        throw new Error('Either email or phone is required')
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        email: email || undefined,
        phone: phone || undefined,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      if (!data?.session?.user) {
        throw new Error('No session data returned')
      }

      const profile: UserProfile = {
        id: data.session.user.id,
        email: data.session.user.email || '',
        phone: phone || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        tier: 'free' as const,
        membership_status: 'active' as const,
        total_spent: 0,
        total_purchases: 0,
        preferences: {
          notifications_enabled: true,
          marketing_emails: false,
          guest_account: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert(profile)

      if (profileError) throw profileError
      setUser(profile)
    } catch (error) {
      console.error('Error creating guest profile:', error)
      setError('Failed to create guest profile')
    }
  }

  const hasPremiumAccess = () => {
    return user?.tier === 'premium' || user?.tier === 'vip'
  }

  const hasVipAccess = () => {
    return user?.tier === 'vip'
  }

  const isMembershipActive = () => {
    if (!user?.membership_status) return false
    if (user.membership_status !== 'active') return false
    if (!user.membership_expires_at) return true
    
    const expiryDate = new Date(user.membership_expires_at)
    return expiryDate > new Date()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithEmail,
        signInWithPhone,
        verifyOtp,
        signOut,
        updateProfile,
        createGuestProfile,
        hasPremiumAccess,
        hasVipAccess,
        isMembershipActive
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
