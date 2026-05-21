import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: sweepstakes, error } = await supabase
      .from('sweepstakes')
      .select('id, prize_name, end_date')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Sweepstakes fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch sweepstakes' }, { status: 500 })
    }

    if (!sweepstakes) {
      return NextResponse.json({ error: 'No active sweepstakes' }, { status: 404 })
    }

    const { count } = await supabase
      .from('sweepstakes_entries')
      .select('*', { count: 'exact', head: true })
      .eq('sweepstakes_id', sweepstakes.id)

    return NextResponse.json({
      id: sweepstakes.id,
      prize_name: sweepstakes.prize_name,
      end_date: sweepstakes.end_date,
      entry_count: count ?? 0,
    })
  } catch (error: any) {
    console.error('Error fetching active sweepstakes:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
