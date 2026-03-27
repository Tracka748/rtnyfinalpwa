import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAccess } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function randomChars(n: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function buildInitial(value: string): string {
  // park_ave → PA, hip_hop → HH, urban → UR
  const parts = value.split('_');
  return parts.map((p) => p[0].toUpperCase()).join('').slice(0, 3);
}

function generateCode(
  targetNeighborhoods: string[],
  targetVibes: string[]
): string {
  const suffix = randomChars(4);
  if (targetNeighborhoods.length > 0) {
    return `RTNY-${buildInitial(targetNeighborhoods[0])}-${suffix}`;
  }
  if (targetVibes.length > 0) {
    return `RTNY-${buildInitial(targetVibes[0])}-${suffix}`;
  }
  return `RTNY-${suffix}`;
}

export async function POST(request: Request) {
  const { isAdmin, user, error: authError } = await checkAdminAccess();
  if (!isAdmin || !user) {
    return NextResponse.json(
      { error: authError ?? 'Admin access required', success: false },
      { status: authError === 'Not authenticated' ? 401 : 403 }
    );
  }

  try {
    const body = await request.json();

    const {
      event_id,
      code,
      discount_type,
      discount_value,
      usage_limit,
      valid_from,
      valid_until,
      target_neighborhoods = [],
      target_vibes = [],
      target_age_ranges = [],
    } = body;

    if (!discount_type || discount_value == null || !valid_until) {
      return NextResponse.json(
        { error: 'discount_type, discount_value, and valid_until are required', success: false },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json(
        { error: 'discount_type must be "percentage" or "fixed"', success: false },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const finalCode = (code && code.trim())
      ? code.trim().toUpperCase()
      : generateCode(target_neighborhoods, target_vibes);

    const audienceScope = {
      neighborhoods: target_neighborhoods,
      vibes: target_vibes,
      age_ranges: target_age_ranges,
    };

    const insertPayload: Record<string, unknown> = {
      code: finalCode,
      discount_type,
      discount_value: Number(discount_value),
      usage_limit: usage_limit ? Number(usage_limit) : null,
      valid_from: valid_from ?? new Date().toISOString(),
      valid_until,
      active: true,
      usage_count: 0,
      created_by: user.id,
      audience_scope: audienceScope,
    };

    if (event_id) insertPayload.event_id = event_id;

    const { data, error } = await supabase
      .from('promo_codes')
      .insert(insertPayload)
      .select('id, code, discount_type, discount_value, usage_limit, valid_until, audience_scope')
      .single();

    if (error) {
      console.error('=== Promo code create DB error ===', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to create promo code', details: error.message, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { promo_code: data },
    });
  } catch (err) {
    console.error('=== Promo code generate unexpected error ===', err);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
