export * from './auth'
export * from './events'
export * from './tickets'
export * from './venues'
export * from './promoters'
export * from './membership'
export * from './sweepstakes'
export * from './promo-codes'

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
  name: string
  description: string
  event_date: string
  doors_open?: string
  event_end?: string
  venue_id: string
  venue_name?: string
  venue_address?: string
  promoter_id: string
  category: string
  status: 'draft' | 'active' | 'sold_out' | 'cancelled'
  featured: boolean
  age_restriction: string
  ticket_types: TicketType[]
  max_tickets_per_user: number
  special_instructions?: string
  image_url?: string
  tags?: string[]
  created_at: string
  updated_at: string
  
  // Joined data (optional)
  venues?: Venue
  promoters?: User
  tickets?: Ticket[]
  
  // Computed properties
  available_tickets?: number
  min_price?: number
  max_price?: number
}

export interface TicketType {
  id: string
  name: string
  price: number
  available_count: number
  total_count: number
  description?: string
  perks?: string[]
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

export interface FilterOptions {
  category?: string
  venue?: string
  date_range?: 'today' | 'this_week' | 'this_month' | 'all'
  price_range?: 'free' | 'under_25' | 'under_50' | 'under_100' | 'all'
  status?: 'active' | 'sold_out' | 'all'
  featured?: boolean
}

export interface SortOptions {
  field: 'date' | 'name' | 'price' | 'created_at'
  direction: 'asc' | 'desc'
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
