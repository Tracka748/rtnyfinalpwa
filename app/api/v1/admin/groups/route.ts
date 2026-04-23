import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin-auth';

export async function GET() {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const supabase = createSupabaseAdmin();

    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, slug, name, tagline, card_image_url, accent_color, category, member_count, is_active, sort_order')
      .order('sort_order', { ascending: true });

    if (groupsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const groupIds = groups.map((g) => g.id);

    const { data: assignments, error: assignmentsError } = await supabase
      .from('group_organizers')
      .select('id, group_id, promoter_id, assigned_at')
      .in('group_id', groupIds);

    if (assignmentsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch group organizers' }, { status: 500 });
    }

    const promoterIds = [...new Set((assignments ?? []).map((a) => a.promoter_id))];

    let promoters: { id: string; user_id: string; display_name: string }[] = [];
    if (promoterIds.length > 0) {
      const { data: promotersData, error: promotersError } = await supabase
        .from('promoters')
        .select('id, user_id, display_name')
        .in('id', promoterIds);

      if (promotersError) {
        return NextResponse.json({ success: false, error: 'Failed to fetch promoters' }, { status: 500 });
      }
      promoters = promotersData ?? [];
    }

    const userIds = [...new Set(promoters.map((p) => p.user_id))];

    let profiles: { id: string; email: string }[] = [];
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) {
        return NextResponse.json({ success: false, error: 'Failed to fetch profiles' }, { status: 500 });
      }
      profiles = profilesData ?? [];
    }

    const promoterMap = new Map(promoters.map((p) => [p.id, p]));
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const assignmentsByGroup = new Map<string, typeof assignments>();
    for (const assignment of assignments ?? []) {
      if (!assignmentsByGroup.has(assignment.group_id)) {
        assignmentsByGroup.set(assignment.group_id, []);
      }
      assignmentsByGroup.get(assignment.group_id)!.push(assignment);
    }

    const data = groups.map((group) => {
      const groupAssignments = assignmentsByGroup.get(group.id) ?? [];
      const organizers = groupAssignments.map((a) => {
        const promoter = promoterMap.get(a.promoter_id);
        const profile = promoter ? profileMap.get(promoter.user_id) : undefined;
        return {
          assignment_id: a.id,
          promoter_id: a.promoter_id,
          user_id: promoter?.user_id ?? null,
          display_name: promoter?.display_name ?? null,
          email: profile?.email ?? null,
          assigned_at: a.assigned_at,
        };
      });
      return { ...group, organizers };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Admin groups GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
