import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAnonClient } from '@/lib/supabase/server';
import { checkIsAdmin } from '@/lib/admin-auth';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const supabase = await createAnonClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { promoter_id, feature_id } = body as {
      promoter_id: string;
      feature_id: string;
    };

    if (!promoter_id || !feature_id) {
      return NextResponse.json(
        { success: false, error: 'promoter_id and feature_id are required' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: feature, error: featureError } = await admin
      .from('toolkit_features')
      .select('id')
      .eq('id', feature_id)
      .eq('is_active', true)
      .maybeSingle();

    if (featureError) {
      console.error('[toolkit/admin-grant] feature lookup error:', featureError);
      return NextResponse.json({ success: false, error: 'Failed to fetch feature' }, { status: 500 });
    }

    if (!feature) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }

    const { data: promoter, error: promoterError } = await admin
      .from('promoters')
      .select('id')
      .eq('id', promoter_id)
      .maybeSingle();

    if (promoterError) {
      console.error('[toolkit/admin-grant] promoter lookup error:', promoterError);
      return NextResponse.json({ success: false, error: 'Failed to fetch promoter' }, { status: 500 });
    }

    if (!promoter) {
      return NextResponse.json({ success: false, error: 'Promoter not found' }, { status: 404 });
    }

    const { data: existing, error: existingError } = await admin
      .from('promoter_features')
      .select('id')
      .eq('promoter_id', promoter_id)
      .eq('feature_id', feature_id)
      .maybeSingle();

    if (existingError) {
      console.error('[toolkit/admin-grant] existing check error:', existingError);
      return NextResponse.json({ success: false, error: 'Failed to check existing unlock' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Feature already unlocked' },
        { status: 409 }
      );
    }

    const { data: newFeature, error: insertError } = await admin
      .from('promoter_features')
      .insert({
        promoter_id,
        feature_id,
        unlock_type: 'admin_granted',
        unlocked_at: new Date().toISOString(),
        granted_by: user!.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[toolkit/admin-grant] insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to grant feature' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newFeature });
  } catch (error: any) {
    console.error('[toolkit/admin-grant] unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
