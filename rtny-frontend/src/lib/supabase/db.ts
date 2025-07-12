import { supabase } from './client'
import { UserProfile } from '../types'

import { supabase } from './client'
import { User, Membership, Venue, Event, Ticket, Perk, MembershipPerk, SweepstakesEntry } from '../types'

// Users
export async function getUser(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as User
  } catch (err) {
    console.error('Error fetching user:', err)
    throw err
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as User
  } catch (err) {
    console.error('Error updating user:', err)
    throw err
  }
}

// Memberships
export async function getMembership(userId: string): Promise<Membership | null> {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Membership
  } catch (err) {
    console.error('Error fetching membership:', err)
    throw err
  }
}

export async function createMembership(userId: string, tier: 'free' | 'premium' | 'vip'): Promise<Membership | null> {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .insert([
        {
          user_id: userId,
          tier,
          start_date: new Date().toISOString(),
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Membership
  } catch (err) {
    console.error('Error creating membership:', err)
    throw err
  }
}

// Venues
export async function getVenue(venueId: string): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Venue
  } catch (err) {
    console.error('Error fetching venue:', err)
    throw err
  }
}

export async function getVenues(filters?: {
  city?: string
  state?: string
}): Promise<Venue[]> {
  try {
    let query = supabase
      .from('venues')
      .select('*')
      .order('name')

    if (filters?.city) {
      query = query.eq('city', filters.city)
    }

    if (filters?.state) {
      query = query.eq('state', filters.state)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError(error.message)
    return data as Venue[]
  } catch (err) {
    console.error('Error fetching venues:', err)
    throw err
  }
}

// Events
export async function getEvents(filters?: {
  venueId?: string
  status?: 'draft' | 'published' | 'cancelled' | 'completed'
  startDate?: string
  endDate?: string
}): Promise<Event[]> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })

    if (filters?.venueId) {
      query = query.eq('venue_id', filters.venueId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.startDate) {
      query = query.gte('event_date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('event_date', filters.endDate)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError(error.message)
    return data as Event[]
  } catch (err) {
    console.error('Error fetching events:', err)
    throw err
  }
}

// Tickets
export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>): Promise<Ticket | null> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticket])
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Ticket
  } catch (err) {
    console.error('Error creating ticket:', err)
    throw err
  }
}

export async function getUserTickets(userId: string, status?: 'available' | 'reserved' | 'sold' | 'cancelled'): Promise<Ticket[]> {
  try {
    let query = supabase
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError(error.message)
    return data as Ticket[]
  } catch (err) {
    console.error('Error fetching user tickets:', err)
    throw err
  }
}

// Perks
export async function getPerks(filters?: {
  tier?: 'free' | 'premium' | 'vip'
  active?: boolean
}): Promise<Perk[]> {
  try {
    let query = supabase
      .from('perks')
      .select('*')
      .order('name')

    if (filters?.tier) {
      query = query.eq('tier_requirement', filters.tier)
    }

    if (filters?.active !== undefined) {
      query = query.eq('is_active', filters.active)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError(error.message)
    return data as Perk[]
  } catch (err) {
    console.error('Error fetching perks:', err)
    throw err
  }
}

export async function getUserPerks(userId: string): Promise<MembershipPerk[]> {
  try {
    const { data, error } = await supabase
      .from('membership_perks')
      .select('*')
      .eq('membership_id', userId)
      .order('granted_at', { ascending: false })

    if (error) throw new DatabaseError(error.message)
    return data as MembershipPerk[]
  } catch (err) {
    console.error('Error fetching user perks:', err)
    throw err
  }
}

// Sweepstakes
export async function enterSweepstakes(userId: string, eventId: string): Promise<SweepstakesEntry | null> {
  try {
    const { data, error } = await supabase
      .from('sweepstakes_entries')
      .insert([
        {
          user_id: userId,
          event_id: eventId
        }
      ])
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as SweepstakesEntry
  } catch (err) {
    console.error('Error entering sweepstakes:', err)
    throw err
  }
}

// Real-time subscriptions
export function subscribeToUserEvents(userId: string, callback: (event: Event) => void) {
  return supabase
    .channel('events')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `venue_id=in.(SELECT venue_id FROM tickets WHERE user_id=eq.${userId})`
      },
      (payload) => {
        callback(payload.new as Event)
      }
    )
    .subscribe()
}

export function subscribeToUserTickets(userId: string, callback: (ticket: Ticket) => void) {
  return supabase
    .channel('tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Ticket)
      }
    )
    .subscribe()
}

export function subscribeToUserPerks(userId: string, callback: (perk: MembershipPerk) => void) {
  return supabase
    .channel('perks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'membership_perks',
        filter: `membership_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as MembershipPerk)
      }
    )
    .subscribe()
}

export function subscribeToSweepstakesEntries(userId: string, callback: (entry: SweepstakesEntry) => void) {
  return supabase
    .channel('sweepstakes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sweepstakes_entries',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as SweepstakesEntry)
      }
    )
    .subscribe()
}

// Error Handling
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Users
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as UserProfile
  } catch (err) {
    console.error('Error fetching user profile:', err)
    throw err
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as UserProfile
  } catch (err) {
    console.error('Error updating user profile:', err)
    throw err
  }
}

// Events
export async function getEvents(filters?: {
  status?: string
  search?: string
  venueId?: string
}): Promise<Event[]> {
  try {
    let query = supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    if (filters?.venueId) {
      query = query.eq('venue_id', filters.venueId)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError(error.message)
    return data as Event[]
  } catch (err) {
    console.error('Error fetching events:', err)
    throw err
  }
}

export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Event
  } catch (err) {
    console.error('Error fetching event:', err)
    throw err
  }
}

// Tickets
export async function createTicket(ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>): Promise<Ticket | null> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticket])
      .select()
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Ticket
  } catch (err) {
    console.error('Error creating ticket:', err)
    throw err
  }
}

export async function getUserTickets(userId: string): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new DatabaseError(error.message)
    return data as Ticket[]
  } catch (err) {
    console.error('Error fetching user tickets:', err)
    throw err
  }
}

// Venues
export async function getVenues(): Promise<Venue[]> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name')

    if (error) throw new DatabaseError(error.message)
    return data as Venue[]
  } catch (err) {
    console.error('Error fetching venues:', err)
    throw err
  }
}

// Memberships
export async function getUserMembership(userId: string): Promise<Membership | null> {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw new DatabaseError(error.message)
    return data as Membership
  } catch (err) {
    console.error('Error fetching user membership:', err)
    throw err
  }
}

// Real-time subscriptions
export function subscribeToEvents(callback: (event: Event) => void) {
  return supabase
    .channel('events')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events'
      },
      (payload) => {
        callback(payload.new as Event)
      }
    )
    .subscribe()
}

export function subscribeToUserTickets(userId: string, callback: (ticket: Ticket) => void) {
  return supabase
    .channel('tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Ticket)
      }
    )
    .subscribe()
}
