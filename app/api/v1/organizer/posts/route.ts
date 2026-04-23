import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const VALID_POST_TYPES = ['announcement', 'update', 'poll'] as const;

async function getPromoterAndGroups(db: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const { data: promoter } = await db
    .from('promoters')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!promoter) return { promoter: null, groupIds: [] };

  const { data: orgRows } = await db
    .from('group_organizers')
    .select('group_id')
    .eq('promoter_id', promoter.id);

  const groupIds = (orgRows ?? []).map((r) => r.group_id);
  return { promoter, groupIds };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdmin();

    const { groupIds } = await getPromoterAndGroups(db, user.id);

    if (groupIds.length === 0) {
      const isCount = req.nextUrl.searchParams.get('count') === 'true';
      return NextResponse.json(isCount ? { success: true, data: { count: 0 } } : { success: true, data: [] });
    }

    const isCount = req.nextUrl.searchParams.get('count') === 'true';

    if (isCount) {
      const { count, error } = await db
        .from('group_posts')
        .select('id', { count: 'exact', head: true })
        .in('group_id', groupIds);

      if (error) {
        console.error('[organizer/posts] count error:', error);
        return NextResponse.json({ error: 'Failed to count posts' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: { count: count ?? 0 } });
    }

    const { data: posts, error: postsError } = await db
      .from('group_posts')
      .select('id, group_id, author_id, title, body, post_type, is_pinned, created_at')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsError) {
      console.error('[organizer/posts] posts error:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Fetch group names for enrichment
    const { data: groups } = await db
      .from('groups')
      .select('id, name')
      .in('id', groupIds);

    const groupNameMap: Record<string, string> = {};
    (groups ?? []).forEach((g) => { groupNameMap[g.id] = g.name; });

    const enriched = (posts ?? []).map((p) => ({
      ...p,
      group_name: groupNameMap[p.group_id] ?? null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[organizer/posts] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdmin();

    const body = await req.json();
    const { group_id, title, body: postBody, post_type, is_pinned } = body;

    if (!group_id || !title || !postBody || !post_type) {
      return NextResponse.json({ error: 'Missing required fields: group_id, title, body, post_type' }, { status: 400 });
    }

    if (!VALID_POST_TYPES.includes(post_type)) {
      return NextResponse.json({ error: `post_type must be one of: ${VALID_POST_TYPES.join(', ')}` }, { status: 400 });
    }

    const { promoter, groupIds } = await getPromoterAndGroups(db, user.id);

    if (!promoter) {
      return NextResponse.json({ error: 'No promoter profile found' }, { status: 403 });
    }

    if (!groupIds.includes(group_id)) {
      return NextResponse.json({ error: 'You do not manage this group' }, { status: 403 });
    }

    const { data: post, error: insertError } = await db
      .from('group_posts')
      .insert({
        group_id,
        author_id: user.id,
        title,
        body: postBody,
        post_type,
        is_pinned: is_pinned ?? false,
      })
      .select('id, group_id, author_id, title, body, post_type, is_pinned, created_at')
      .single();

    if (insertError) {
      console.error('[organizer/posts] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error('[organizer/posts] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
