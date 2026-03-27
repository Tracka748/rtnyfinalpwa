import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
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
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, usage_limit, usage_count, valid_from, valid_until, status, audience_scope, event_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('=== Promo codes list DB error ===', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to fetch promo codes', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('=== Promo codes list unexpected error ===', err);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
