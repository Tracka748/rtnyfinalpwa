import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { formatPhoneNumber } from '../lib/phoneUtils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export interface UserProfile {
  id: string
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  tier: 'free' | 'premium' | 'vip'
  membership_status: 'active' | 'inactive' | 'expired'
  membership_expires_at?: string
  total_spent: number
  total_purchases: number
  preferences: {
    notifications_enabled?: boolean
    marketing_emails?: boolean
    guest_account?: boolean
  }
  created_at: string
  updated_at: string
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUser(profile as UserProfile)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load user profile')
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          flowType: 'magic_link'
        }
      })

      if (error) throw error
    } catch (err) {
      setError('Failed to send verification code')
      throw err
    }
  }

  const signInWithPhone = async (phone: string) => {
    try {
      const formattedPhone = formatPhoneNumber(phone)
      if (!formattedPhone) {
        setError('Invalid phone number format')
        return
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          flowType: 'sms'
        }
      })

      if (error) throw error
    } catch (err) {
      setError('Failed to send verification code')
      throw err
    }
  }

  const verifyOtp = async (emailOrPhone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'signup',
        email: emailOrPhone.includes('@') ? emailOrPhone : undefined,
        phone: !emailOrPhone.includes('@') ? emailOrPhone : undefined
      })

      if (error) throw error
    } catch (err) {
      setError('Invalid verification code')
      throw err
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setError(null)
    } catch (err) {
      setError('Failed to sign out')
      throw err
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error
      setUser({ ...user, ...updates })
    } catch (err) {
      setError('Failed to update profile')
      throw err
    }
  }

  const createGuestProfile = async (email?: string, phone?: string, firstName?: string, lastName?: string) => {
    try {
      const guestProfile: Partial<UserProfile> = {
        tier: 'free',
        membership_status: 'active',
        total_spent: 0,
        total_purchases: 0,
        preferences: { guest_account: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (email) guestProfile.email = email
      if (phone) guestProfile.phone = phone
      if (firstName) guestProfile.first_name = firstName
      if (lastName) guestProfile.last_name = lastName

      const { error } = await supabase
        .from('users')
        .insert([guestProfile])

      if (error) throw error
    } catch (err) {
      setError('Failed to create guest profile')
      throw err
    }
  }

  const hasPremiumAccess = () => user?.tier === 'premium'
  const hasVipAccess = () => user?.tier === 'vip'
  const isMembershipActive = () => user?.membership_status === 'active'

  const value = {
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
