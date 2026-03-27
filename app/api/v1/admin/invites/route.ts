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

    const { data: runs, error: runsError } = await supabase
      .from('invite_runs')
      .select('id, event_id, sent_count, target_neighborhoods, target_vibes, target_age_ranges, created_at')
      .order('created_at', { ascending: false });

    if (runsError) {
      console.error('invite_runs fetch error:', runsError);
      return NextResponse.json(
        { error: 'Failed to fetch invite runs', success: false },
        { status: 500 }
      );
    }

    const rows = runs ?? [];

    // Collect unique event ids and fetch event names
    const eventIds = [...new Set(rows.map((r) => r.event_id).filter(Boolean))];

    let eventMap = new Map<string, { id: string; name: string }>();
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, name')
        .in('id', eventIds);

      (events ?? []).forEach((e) => eventMap.set(e.id, e));
    }

    const invite_runs = rows.map((run) => ({
      ...run,
      event: eventMap.get(run.event_id) ?? null,
    }));

    return NextResponse.json({ success: true, data: { invite_runs } });
  } catch (error) {
    console.error('Admin invites GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
