// app/api/v1/events/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get query params for filtering (optional)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')

    // Build query
    let query = supabase
      .from('events')
      .select(`
        id,
        name,
        description,
        event_date,
        category,
        flyer_image_url,
        tags,
        featured,
        status,
        total_tickets,
        tickets_sold,
        venues:venue_id (
          name,
          address
        ),
        ticket_types (
          id,
          name,
          price,
          remaining
        )
      `)
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    // Apply filters if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    // Execute query
    const { data: events, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to match frontend Event type
    const transformedEvents = events?.map((event: any) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      event_date: event.event_date,
      venue_name: event.venues?.name || 'Unknown Venue',
      venue_address: event.venues?.address || '',
      flyer_image_url: event.flyer_image_url || 'https://placehold.co/800x1000/1a1a1a/59FFA0?text=Event&font=roboto',
      min_price: event.ticket_types?.length > 0 
        ? Math.min(...event.ticket_types.map((t: any) => t.price))
        : 0,
      max_price: event.ticket_types?.length > 0
        ? Math.max(...event.ticket_types.map((t: any) => t.price))
        : 0,
      category: event.category,
      featured: event.featured,
      status: event.status,
      tickets_available: event.ticket_types?.reduce((sum: number, t: any) => sum + t.remaining, 0) || 0,
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedEvents,
      count: transformedEvents.length
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}