import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

function getAdminClient() {
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
    const supabase = getAdminClient();

    const [grantsRes, featuresRes, promotersRes, profilesRes] = await Promise.all([
      supabase
        .from('promoter_features')
        .select('id, promoter_id, feature_id, unlock_type, unlocked_at, expires_at, granted_by')
        .order('unlocked_at', { ascending: false }),

      supabase
        .from('toolkit_features')
        .select('id, name, icon, is_active, sort_order')
        .order('sort_order', { ascending: true }),

      supabase
        .from('promoters')
        .select('id, user_id, display_name, status'),

      supabase
        .from('profiles')
        .select('id, email, first_name, last_name'),
    ]);

    if (grantsRes.error) {
      console.error('[admin/toolkit/grants] grants error:', grantsRes.error);
      return NextResponse.json({ success: false, error: 'Failed to fetch grants' }, { status: 500 });
    }
    if (featuresRes.error) {
      console.error('[admin/toolkit/grants] features error:', featuresRes.error);
      return NextResponse.json({ success: false, error: 'Failed to fetch features' }, { status: 500 });
    }

    const featureMap = new Map((featuresRes.data ?? []).map(f => [f.id, f]));
    const promoterMap = new Map((promotersRes.data ?? []).map(p => [p.id, p]));
    const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));

    const grants = (grantsRes.data ?? []).map(g => {
      const promoter = promoterMap.get(g.promoter_id);
      const feature = featureMap.get(g.feature_id);
      return {
        ...g,
        promoter_display_name: promoter?.display_name ?? 'Unknown',
        feature_name: feature?.name ?? g.feature_id,
        feature_icon: feature?.icon ?? '🔧',
      };
    });

    const promoters = (promotersRes.data ?? []).map(p => {
      const profile = profileMap.get(p.user_id);
      return {
        id: p.id,
        display_name: p.display_name,
        status: p.status,
        user_email: profile?.email ?? null,
        user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        grants,
        features: featuresRes.data ?? [],
        promoters,
      },
    });
  } catch (error: any) {
    console.error('[admin/toolkit/grants] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
