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

    // Query 1: profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, neighborhood, age_range, gender, is_parent');

    // Query 2: user_vibes
    const { data: userVibes } = await supabase
      .from('user_vibes')
      .select('user_id, vibe_tags');

    // Query 3: user_behavior_snapshot
    const { data: snapshots } = await supabase
      .from('user_behavior_snapshot')
      .select('user_id, avg_spend, activity_level, purchase_pattern, preferred_event_time');

    // Query 4: active vibe tag vocabulary — governed by the vibe_tags table now,
    // not a hardcoded list of a vocabulary that predates it.
    const { data: vibeTagRows } = await supabase
      .from('vibe_tags')
      .select('slug')
      .eq('is_active', true);

    const p = profiles ?? [];
    const v = userVibes ?? [];
    const s = snapshots ?? [];

    // Neighborhoods
    const neighborhoods: Record<string, number> = {
      park_ave: 0, east_end: 0, monroe_ave: 0, southwest: 0,
      urban: 0, suburban: 0, other: 0, unknown: 0,
    };
    p.forEach((row) => {
      const n = row.neighborhood?.toLowerCase().replace(/\s+/g, '_') ?? '';
      if (n in neighborhoods) neighborhoods[n]++;
      else neighborhoods.unknown++;
    });

    // Age ranges
    const age_ranges: Record<string, number> = {
      '18-20': 0, '21-25': 0, '26-30': 0, '31-35': 0, '36-45': 0, '46+': 0, unknown: 0,
    };
    p.forEach((row) => {
      const a = row.age_range ?? '';
      if (a in age_ranges) age_ranges[a]++;
      else age_ranges.unknown++;
    });

    // Gender
    const gender: Record<string, number> = {
      man: 0, woman: 0, non_binary: 0, prefer_not_to_say: 0, unknown: 0,
    };
    p.forEach((row) => {
      const g = row.gender?.toLowerCase().replace(/[\s-]+/g, '_') ?? '';
      if (g in gender) gender[g]++;
      else gender.unknown++;
    });

    // Is parent
    const is_parent = { parent: 0, non_parent: 0 };
    p.forEach((row) => {
      if (row.is_parent) is_parent.parent++;
      else is_parent.non_parent++;
    });

    // Vibe tags — keyed by every active slug from vibe_tags, not a fixed list.
    // Vocabulary is single-format now (all hyphenated), so this is a direct
    // membership check with no normalization needed.
    const vibe_tags: Record<string, number> = {};
    (vibeTagRows ?? []).forEach((row) => {
      vibe_tags[row.slug] = 0;
    });
    v.forEach((row) => {
      const tags: string[] = Array.isArray(row.vibe_tags) ? row.vibe_tags : [];
      tags.forEach((tag) => {
        if (tag in vibe_tags) vibe_tags[tag]++;
      });
    });

    // Activity levels
    const activity_levels: Record<string, number> = { high: 0, medium: 0, low: 0, dormant: 0 };
    s.forEach((row) => {
      const l = row.activity_level?.toLowerCase() ?? '';
      if (l in activity_levels) activity_levels[l]++;
    });

    // Purchase patterns
    const purchase_patterns: Record<string, number> = { advance_buyer: 0, last_minute: 0, mixed: 0 };
    s.forEach((row) => {
      const pp = row.purchase_pattern?.toLowerCase().replace(/\s+/g, '_') ?? '';
      if (pp in purchase_patterns) purchase_patterns[pp]++;
    });

    // Preferred event times
    const preferred_event_times: Record<string, number> = { daytime: 0, evening: 0, late_night: 0 };
    s.forEach((row) => {
      const t = row.preferred_event_time?.toLowerCase().replace(/\s+/g, '_') ?? '';
      if (t in preferred_event_times) preferred_event_times[t]++;
    });

    // Avg platform spend
    const spends = s.map((row) => row.avg_spend ?? 0).filter((n) => n > 0);
    const avg_platform_spend =
      spends.length > 0 ? spends.reduce((a, b) => a + b, 0) / spends.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        total_users: p.length,
        neighborhoods,
        age_ranges,
        gender,
        is_parent,
        vibe_tags,
        activity_levels,
        purchase_patterns,
        preferred_event_times,
        avg_platform_spend: Math.round(avg_platform_spend * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Audience overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
