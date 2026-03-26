import { NextRequest, NextResponse } from 'next/server';
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
  _request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const adminCheck = await checkIsAdmin();
    if (adminCheck.error) return adminCheck.response;

    const { user_id } = await params;
    const supabase = getSupabaseAdmin();

    // Fetch behavior snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('user_behavior_snapshot')
      .select('avg_spend, total_orders, purchase_pattern, preferred_event_time, activity_level, last_calculated_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (snapshotError) {
      console.error('Snapshot fetch error:', snapshotError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch snapshot', details: snapshotError.message },
        { status: 500 }
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, display_name, neighborhood, age_range, gender, is_parent')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Fetch vibe tags
    const { data: vibes } = await supabase
      .from('user_vibes')
      .select('vibe_tags')
      .eq('user_id', user_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        user_id,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        display_name: profile?.display_name ?? null,
        neighborhood: profile?.neighborhood ?? null,
        age_range: profile?.age_range ?? null,
        gender: profile?.gender ?? null,
        is_parent: profile?.is_parent ?? null,
        vibe_tags: vibes?.vibe_tags ?? [],
        avg_spend: snapshot?.avg_spend ?? null,
        total_orders: snapshot?.total_orders ?? null,
        purchase_pattern: snapshot?.purchase_pattern ?? null,
        preferred_event_time: snapshot?.preferred_event_time ?? null,
        activity_level: snapshot?.activity_level ?? null,
        last_calculated_at: snapshot?.last_calculated_at ?? null,
      },
    });
  } catch (error) {
    console.error('Behavior snapshot GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
