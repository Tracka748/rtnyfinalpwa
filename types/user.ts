export interface User {
  id: string
  email?: string
  phone?: string
  name?: string
  created_at: string
  updated_at: string
  preferences: Record<string, any>
}

export interface UserProfile extends User {
  membership?: Membership
}
