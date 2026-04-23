import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // After getUser()
    console.log('[organizer/groups] user.id:', user.id);

    // Use admin client for DB queries to bypass RLS
    const db = createSupabaseAdmin();

    // 1. Get promoter row for this user
    const { data: promoter } = await db
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    // After promoter fetch
    console.log('[organizer/groups] promoter:', promoter);

    if (!promoter) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Get group_ids this promoter organizes
    const { data: orgRows } = await db
      .from('group_organizers')
      .select('group_id')
      .eq('promoter_id', promoter.id);

    // After orgRows fetch
    console.log('[organizer/groups] orgRows:', orgRows);

    const groupIds = (orgRows ?? []).map((r) => r.group_id);

    // After groupIds
    console.log('[organizer/groups] groupIds:', groupIds);

    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 3. Fetch the groups
    const { data: groups, error: groupsError } = await db
      .from('groups')
      .select('id, slug, name, tagline, card_image_url, accent_color, category, member_count, is_active')
      .in('id', groupIds);

    if (groupsError) {
      console.error('[organizer/groups] groups error:', groupsError);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    const allGroups = groups ?? [];

    // 4. Fetch active member counts per group
    const { data: memberships } = await db
      .from('group_memberships')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('status', 'active');

    const countMap: Record<string, number> = {};
    (memberships ?? []).forEach((m) => {
      countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1;
    });

    // 5. Merge member_count from live memberships
    const enriched = allGroups.map((g) => ({
      ...g,
      member_count: countMap[g.id] ?? 0,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[organizer/groups] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
