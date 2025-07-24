export interface AuthResponse {
  user: User
  session: Session
  token: string
}

export interface User {
  id: string
  email: string
  phone: string | null
  first_name: string
  last_name: string
  profile_image_url: string | null
  tier: 'free' | 'premium' | 'vip'
  membership_status: 'active' | 'expired' | 'suspended'
  membership_expires_at: Date | null
  referral_code: string
  referred_by: string | null
  total_spent: number
  total_purchases: number
  preferences: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  user_id: string
  expires_at: Date
  created_at: Date
}

export interface AuthAPI {
  signInWithEmail(email: string): Promise<AuthResponse>
  signInWithPhone(phone: string): Promise<AuthResponse>
  verifyOtp(identifier: string, token: string): Promise<AuthResponse>
  signOut(): Promise<void>
  getUser(): Promise<User | null>
  updateProfile(data: Partial<User>): Promise<void>
}
