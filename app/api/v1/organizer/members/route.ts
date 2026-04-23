import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdmin();

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

    // 2. Get all group_ids this organizer manages
    const { data: orgRows } = await db
      .from('group_organizers')
      .select('group_id')
      .eq('promoter_id', promoter.id);

    const allGroupIds = (orgRows ?? []).map((r) => r.group_id);

    if (allGroupIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 3. Apply optional ?group_id= filter
    const groupIdFilter = req.nextUrl.searchParams.get('group_id');
    let groupIds = allGroupIds;

    if (groupIdFilter) {
      if (!allGroupIds.includes(groupIdFilter)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      groupIds = [groupIdFilter];
    }

    // 4. Fetch active memberships
    const { data: memberships, error: membershipsError } = await db
      .from('group_memberships')
      .select('id, user_id, group_id, joined_at')
      .in('group_id', groupIds)
      .eq('status', 'active');

    if (membershipsError) {
      console.error('[organizer/members] memberships error:', membershipsError);
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
    }

    const allMemberships = memberships ?? [];

    if (allMemberships.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 5. Fetch profiles for all member user_ids
    const userIds = [...new Set(allMemberships.map((m) => m.user_id))];

    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('[organizer/members] profiles error:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // 6. Fetch group names
    const { data: groups } = await db
      .from('groups')
      .select('id, name')
      .in('id', groupIds);

    // 7. Build lookup maps
    const profileMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
    (profiles ?? []).forEach((p) => {
      profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
    });

    const groupNameMap: Record<string, string> = {};
    (groups ?? []).forEach((g) => { groupNameMap[g.id] = g.name; });

    // 8. Merge and return
    const enriched = allMemberships.map((m) => {
      const profile = profileMap[m.user_id] ?? { first_name: null, last_name: null, email: null };
      return {
        id: m.id,
        user_id: m.user_id,
        group_id: m.group_id,
        group_name: groupNameMap[m.group_id] ?? null,
        joined_at: m.joined_at,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[organizer/members] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
