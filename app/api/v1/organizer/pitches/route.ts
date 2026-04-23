import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get promoter row
    const { data: promoter } = await supabase
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!promoter) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Get group_ids this organizer manages
    const { data: orgRows } = await supabase
      .from('group_organizers')
      .select('group_id')
      .eq('promoter_id', promoter.id);

    const groupIds = (orgRows ?? []).map((r) => r.group_id);

    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 3. Fetch pitches for these groups
    const { data: pitches, error: pitchesError } = await supabase
      .from('event_pitches')
      .select(
        'id, group_id, organizer_id, title, description, category, date_start, date_end, price_min, price_max, preferred_locations, ideas_details, interest_count, status, created_at, updated_at'
      )
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    if (pitchesError) {
      console.error('[organizer/pitches] pitches error:', pitchesError);
      return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 });
    }

    // 4. Fetch group names
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .in('id', groupIds);

    const groupNameMap: Record<string, string> = {};
    (groups ?? []).forEach((g) => { groupNameMap[g.id] = g.name; });

    // 5. Merge group name
    const enriched = (pitches ?? []).map((p) => ({
      ...p,
      group_name: groupNameMap[p.group_id] ?? null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[organizer/pitches] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
