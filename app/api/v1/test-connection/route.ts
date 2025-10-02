// app/api/v1/test-connection/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    const supabase = createSupabaseAdmin()
    
    // Test connection by directly querying your known tables
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1)

    // Count total users and events
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: eventCount, error: eventCountError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        connection_status: 'connected',
        tables_tested: ['users', 'events', 'profiles'],
        users_table: {
          accessible: !usersError,
          error: usersError?.message || null,
          sample_data: users?.[0] || null,
          total_count: userCount || 0
        },
        events_table: {
          accessible: !eventsError,
          error: eventsError?.message || null,
          sample_data: events?.[0] || null,
          total_count: eventCount || 0
        },
        profiles_table: {
          accessible: !profilesError,
          error: profilesError?.message || null,
          sample_data: profiles?.[0] || null
        }
      }
    })
    
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error during connection test', 
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}