import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdmin();

    // Admins see every group's pitches (read-only); groupIds === null means unscoped
    const isAdmin = !(await checkIsAdmin()).error;
    let groupIds: string[] | null = null;

    if (!isAdmin) {
      // 1. Get promoter row
      const { data: promoter } = await db
        .from('promoters')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!promoter) {
        return NextResponse.json({ success: true, data: [] });
      }

      // 2. Get group_ids this organizer manages
      const { data: orgRows } = await db
        .from('group_organizers')
        .select('group_id')
        .eq('promoter_id', promoter.id);

      groupIds = (orgRows ?? []).map((r) => r.group_id);

      if (groupIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    // 3. Fetch pitches for these groups
    let pitchesQuery = db
      .from('event_pitches')
      .select(
        'id, group_id, organizer_id, title, description, category, date_start, date_end, price_min, price_max, preferred_locations, ideas_details, interest_count, status, created_at, updated_at'
      );
    if (groupIds) pitchesQuery = pitchesQuery.in('group_id', groupIds);
    const { data: pitches, error: pitchesError } = await pitchesQuery
      .order('created_at', { ascending: false });

    if (pitchesError) {
      console.error('[organizer/pitches] pitches error:', pitchesError);
      return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 });
    }

    // 4. Fetch group names
    let groupsQuery = db.from('groups').select('id, name');
    if (groupIds) groupsQuery = groupsQuery.in('id', groupIds);
    const { data: groups } = await groupsQuery;

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
