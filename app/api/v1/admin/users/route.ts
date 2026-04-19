import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/v1/admin/users?tab=all|promoters|organizers|admins&search=
export async function GET(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  const currentUserId = await getCurrentUserId();

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'all';
  const search = searchParams.get('search')?.trim() ?? '';

  try {
    const supabase = getSupabaseAdmin();

    let profilesQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, role, created_at, neighborhood, age_range, gender, is_parent, bio')
      .order('created_at', { ascending: false });

    const roleMap: Record<string, string> = {
      promoters: 'promoter',
      organizers: 'organizer',
      admins: 'admin',
    };
    if (tab !== 'all' && roleMap[tab]) {
      profilesQuery = profilesQuery.eq('role', roleMap[tab]);
    }

    if (search) {
      profilesQuery = profilesQuery.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }

    const profileList = profiles ?? [];

    if (tab === 'all') {
      const userIds = profileList.map((p) => p.id);
      const orderMap: Record<string, { count: number; total: number }> = {};

      if (userIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('user_id, total_amount')
          .in('user_id', userIds);

        for (const order of orders ?? []) {
          if (!orderMap[order.user_id]) orderMap[order.user_id] = { count: 0, total: 0 };
          orderMap[order.user_id].count += 1;
          orderMap[order.user_id].total += Number(order.total_amount ?? 0);
        }
      }

      const enriched = profileList.map((p) => ({
        ...p,
        order_count: orderMap[p.id]?.count ?? 0,
        total_spent: orderMap[p.id]?.total ?? 0,
      }));

      return NextResponse.json({
        success: true,
        data: enriched,
        meta: { currentProfileId: currentUserId },
      });
    }

    if (tab === 'promoters') {
      const { data: promoters } = await supabase
        .from('promoters')
        .select('user_id, display_name, instagram_handle, status');

      const promoterMap: Record<string, { display_name: string | null; instagram_handle: string | null; status: string }> = {};
      for (const p of promoters ?? []) {
        promoterMap[p.user_id] = p;
      }

      const enriched = profileList.map((p) => ({
        ...p,
        promoter: promoterMap[p.id] ?? null,
      }));

      return NextResponse.json({
        success: true,
        data: enriched,
        meta: { currentProfileId: currentUserId },
      });
    }

    return NextResponse.json({
      success: true,
      data: profileList,
      meta: { currentProfileId: currentUserId },
    });
  } catch (err) {
    console.error('Admin users list error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
