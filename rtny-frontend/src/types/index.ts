export interface User {
  id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  date_of_birth?: string
  created_at: string
  updated_at: string
  last_login?: string
  is_active: boolean
  email_verified: boolean
  phone_verified: boolean
}

export interface Membership {
  id: string
  user_id: string
  tier: 'free' | 'premium' | 'vip'
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  capacity: number
  description?: string
  amenities: any[]
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  venue_id: string
  title: string
  description?: string
  event_date: string
  doors_open?: string
  event_end?: string
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  total_tickets: number
  available_tickets: number
  base_price: number
  image_url?: string
  tags: any[]
  age_restriction?: number
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  event_id: string
  user_id?: string
  ticket_number: string
  price: number
  status: 'available' | 'reserved' | 'sold' | 'cancelled'
  seat_section?: string
  seat_row?: string
  seat_number?: string
  purchase_date?: string
  qr_code?: string
  metadata: any
  created_at: string
  updated_at: string
}

export interface Perk {
  id: string
  name: string
  description?: string
  tier_requirement: 'free' | 'premium' | 'vip'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MembershipPerk {
  id: string
  membership_id: string
  perk_id: string
  granted_at: string
  expires_at?: string
  is_active: boolean
}

export interface SweepstakesEntry {
  id: string
  user_id: string
  event_id: string
  entry_date: string
  is_winner: boolean
  prize_description?: string
  claimed_at?: string
}
