import { NextResponse } from 'next/server';
import { createClient as createAnonClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabase = await createAnonClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();

    const { data: promoter, error: promoterError } = await admin
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (promoterError) {
      console.error('[toolkit] promoter lookup error:', promoterError);
      return NextResponse.json({ success: false, error: 'Failed to fetch promoter' }, { status: 500 });
    }

    if (!promoter) {
      return NextResponse.json({ success: false, error: 'Promoter not found' }, { status: 404 });
    }

    const { data: features, error: featuresError } = await admin
      .from('toolkit_features')
      .select('id, name, description, icon, price_one_time, price_monthly, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (featuresError) {
      console.error('[toolkit] features error:', featuresError);
      return NextResponse.json({ success: false, error: 'Failed to fetch features' }, { status: 500 });
    }

    const { data: unlockedFeatures, error: unlockedError } = await admin
      .from('promoter_features')
      .select('feature_id, unlock_type, unlocked_at, expires_at')
      .eq('promoter_id', promoter.id);

    if (unlockedError) {
      console.error('[toolkit] unlocked features error:', unlockedError);
      return NextResponse.json({ success: false, error: 'Failed to fetch unlocked features' }, { status: 500 });
    }

    const unlockMap = new Map<string, { unlock_type: string; unlocked_at: string; expires_at: string | null }>();
    for (const uf of (unlockedFeatures || [])) {
      unlockMap.set(uf.feature_id, {
        unlock_type: uf.unlock_type,
        unlocked_at: uf.unlocked_at,
        expires_at: uf.expires_at,
      });
    }

    const mergedFeatures = (features || []).map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      icon: f.icon,
      price_one_time: f.price_one_time,
      price_monthly: f.price_monthly,
      sort_order: f.sort_order,
      is_unlocked: unlockMap.has(f.id),
      unlock_info: unlockMap.get(f.id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        features: mergedFeatures,
        promoter_id: promoter.id,
      },
    });
  } catch (error) {
    console.error('[toolkit] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
