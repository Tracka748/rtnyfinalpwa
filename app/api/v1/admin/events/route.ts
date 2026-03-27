import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const supabase = getSupabaseAdmin();

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(
        'id, name, event_date, status, category, total_tickets, tickets_sold, featured, target_neighborhoods, target_vibes, venue_id'
      )
      .order('event_date', { ascending: false });

    if (eventsError) {
      return NextResponse.json({ success: false, error: eventsError.message }, { status: 500 });
    }

    const { data: venues } = await supabase
      .from('venues')
      .select('id, name');

    return NextResponse.json({ success: true, data: { events: events ?? [], venues: venues ?? [] } });
  } catch (err) {
    console.error('Admin events list error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
