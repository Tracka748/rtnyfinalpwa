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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, ticket_types (price)')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found', success: false },
        { status: 404 }
      );
    }

    let venue = null;
    if (event.venue_id) {
      const { data: venueData } = await supabase
        .from('venues')
        .select('*')
        .eq('id', event.venue_id)
        .single();
      venue = venueData ?? null;
    }

    const { data: inviteRuns } = await supabase
      .from('invite_runs')
      .select('id, sent_count, target_neighborhoods, target_vibes, target_age_ranges, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: { ...event, venue, invite_runs: inviteRuns ?? [] },
    });
  } catch (error) {
    console.error('Admin event fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
