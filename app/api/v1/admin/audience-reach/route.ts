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

export async function POST(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const body = await request.json();
    const neighborhoods: string[] = body.neighborhoods ?? [];
    const vibe_tags: string[] = body.vibe_tags ?? [];
    const age_ranges: string[] = body.age_ranges ?? [];

    const supabase = getSupabaseAdmin();

    // Query 1: all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, neighborhood, age_range');

    // Query 2: all user_vibes
    const { data: userVibes } = await supabase
      .from('user_vibes')
      .select('user_id, vibe_tags');

    const p = profiles ?? [];
    const v = userVibes ?? [];

    // If no filters selected, return total user count
    if (neighborhoods.length === 0 && vibe_tags.length === 0 && age_ranges.length === 0) {
      return NextResponse.json({
        success: true,
        data: { estimated_reach: p.length },
      });
    }

    // Query 3: merge in JS — build set of matching user ids
    const vibeMap = new Map<string, string[]>();
    v.forEach((row) => {
      const tags: string[] = Array.isArray(row.vibe_tags) ? row.vibe_tags : [];
      vibeMap.set(row.user_id, tags);
    });

    let count = 0;
    for (const profile of p) {
      const neighborhoodMatch =
        neighborhoods.length === 0 ||
        neighborhoods.includes(profile.neighborhood?.toLowerCase().replace(/\s+/g, '_') ?? '');

      const ageMatch =
        age_ranges.length === 0 || age_ranges.includes(profile.age_range ?? '');

      const userTags = vibeMap.get(profile.id) ?? [];
      const vibeMatch =
        vibe_tags.length === 0 ||
        vibe_tags.some((tag) => userTags.includes(tag));

      // Match ANY selected filter (OR across categories, AND within same record)
      if (neighborhoodMatch || vibeMatch || ageMatch) {
        count++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { estimated_reach: count },
    });
  } catch (error) {
    console.error('Audience reach error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
