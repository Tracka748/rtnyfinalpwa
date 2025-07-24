import { useEffect, useState } from 'react'
import { db } from '../lib/supabase/db'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Calendar, Search, Filter, SortAsc, SortDesc, Loader2, AlertCircle, Star, DollarSign } from 'lucide-react'

interface FilterOptions {
  category?: string
  venue?: string
  date_range?: 'today' | 'this_week' | 'this_month' | 'all'
  price_range?: 'free' | 'under_25' | 'under_50' | 'under_100' | 'all'
  status?: 'active' | 'sold_out' | 'all'
  featured?: boolean
  sort?: 'date' | 'name' | 'price'
  order?: 'asc' | 'desc'
}

interface Event {
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
  ticket_types: Array<{
    id: string
    name: string
    price: number
    available_count: number
    total_count: number
    description?: string
    perks?: string[]
  }>
  max_tickets_per_user: number
  special_instructions?: string
  image_url?: string
  tags?: string[]
  created_at: string
  updated_at: string
  
  // Joined data (optional)
  venues?: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zip_code: string
    capacity: number
    amenities: string[]
    status: 'active' | 'inactive'
    created_at: string
    updated_at: string
  }
  promoters?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    created_at: string
    updated_at: string
  }
  tickets?: Array<{
    id: string
    event_id: string
    user_id?: string
    ticket_number: string
    price: number
    status: 'available' | 'reserved' | 'sold' | 'cancelled'
    created_at: string
    updated_at: string
  }>
  
  // Computed properties
  available_tickets?: number
  min_price?: number
  max_price?: number
}

export function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    date_range: 'all',
    venue: '',
    sort: 'date',
    order: 'asc'
  })

  useEffect(() => {
    fetchEvents()
  }, [filters, searchTerm])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const query = db
        .from('events')
        .select(`
          *,
          venues(name, address, city, state, zip_code, capacity, amenities, status),
          promoters(first_name, last_name, email, phone)
        `)
        .eq('status', 'active')

      // Apply search
      if (searchTerm) {
        query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply date range filter
      if (filters.date_range && filters.date_range !== 'all') {
        const today = new Date()
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)

        switch (filters.date_range) {
          case 'today':
            query
              .gte('event_date', startOfDay.toISOString())
              .lt('event_date', new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString())
            break
          case 'this_week':
            const startOfWeek = new Date(startOfDay)
            startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
            query
              .gte('event_date', startOfWeek.toISOString())
              .lt('event_date', new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
            break
          case 'this_month':
            const startOfMonth = new Date(startOfDay)
            startOfMonth.setDate(1)
            query
              .gte('event_date', startOfMonth.toISOString())
              .lt('event_date', new Date(startOfMonth.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString())
            break
        }
      }

      // Apply venue filter
      if (filters.venue) {
        query.ilike('venue_name', `%${filters.venue}%`)
      }

      // Apply category filter
      if (filters.category) {
        query.eq('category', filters.category)
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query.eq('status', filters.status)
      }

      // Apply featured filter
      if (filters.featured) {
        query.eq('featured', filters.featured)
      }

      // Apply sort filter
      switch (filters.sort) {
        case 'date':
          query.order('event_date', { ascending: filters.order === 'asc' })
          break
        case 'name':
          query.order('name', { ascending: filters.order === 'asc' })
          break
        case 'price':
          query.order('min_price', { ascending: filters.order === 'asc' })
          break
      }

      const { data, error: queryError } = await query

      if (queryError) {
        setError(queryError.message)
      } else {
        // Transform data to match our Event interface
        const transformedEvents = data.map(event => ({
          ...event,
          available_tickets: event.ticket_types.reduce((sum: number, ticket: any) => sum + ticket.available_count, 0),
          min_price: event.ticket_types.reduce((min: number, ticket: any) => ticket.price < min ? ticket.price : min, Infinity),
          max_price: event.ticket_types.reduce((max: number, ticket: any) => ticket.price > max ? ticket.price : max, 0)
        }))
        setEvents(transformedEvents)
      }

      setLoading(false)
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [searchTerm, filters])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.toLowerCase()
    setSearchTerm(searchTerm)
  }

  const handleFilterChange = (key: keyof FilterOptions, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSort = (field: 'date' | 'name' | 'price') => {
    setFilters(prev => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-2 text-gray-600">Loading events...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">Error loading events. Please try again later.</p>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={fetchEvents}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Check back soon for upcoming events!'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Events
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.date_range}
              onChange={(e) => handleFilterChange('date_range', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <Input
              type="text"
              value={filters.venue}
              onChange={(e) => handleFilterChange('venue', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={filters.sort === 'date' ? 'default' : 'outline'}
          onClick={() => handleSort('date')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Date {filters.sort === 'date' && (
            <>{filters.order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}</>
          )}
        </Button>
        <Button
          variant={filters.sort === 'name' ? 'default' : 'outline'}
          onClick={() => handleSort('name')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Name {filters.sort === 'name' && (
            <>{filters.order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}</>
          )}
        </Button>
        <Button
          variant={filters.sort === 'price' ? 'default' : 'outline'}
          onClick={() => handleSort('price')}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Price {filters.sort === 'price' && (
            <>{filters.order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}</>
          )}
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const minPrice = event.ticket_types.reduce((min: number, ticket: any) => 
            ticket.price < min ? ticket.price : min, 
            event.ticket_types[0]?.price || Infinity
          )

          const totalAvailable = event.ticket_types.reduce((sum: number, ticket: any) => 
            sum + ticket.available_count, 
            0
          )

          return (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            >
              {/* Event Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Calendar className="text-white" size={48} />
                  </div>
                )}
                
                {/* Featured Badge */}
                {event.featured && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Star size={12} className="mr-1" />
                    Featured
                  </div>
                )}

                {/* Status Badge */}
                {event.status === 'sold_out' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
                      SOLD OUT
                    </span>
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{event.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Venue:</span>
                    <span className="font-medium">{event.venue_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">${minPrice}</span>
                    <span className="text-sm text-gray-500">{totalAvailable} tickets</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
