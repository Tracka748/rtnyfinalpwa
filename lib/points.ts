export const POINT_VALUES: Record<string, number> = {
  quick_submit:      10,
  date_vote:          5,
  location_vote:      5,
  price_vote:         5,
  full_form_submit:  25,
  feedback_update:    5,
}

export const BADGES = [
  { min: 300, slug: 'rtny_og',        title: 'RTNY OG',        emoji: '👑' },
  { min: 150, slug: 'scene_builder',  title: 'Scene Builder',  emoji: '⭐' },
  { min:  50, slug: 'event_insider',  title: 'Event Insider',  emoji: '🔥' },
  { min:  10, slug: 'founding_voice', title: 'Founding Voice', emoji: '🎟' },
]

export function resolveBadge(total: number): typeof BADGES[0] | null {
  return BADGES.find(b => total >= b.min) ?? null
}

/**
 * Awards points for a single action.
 * Accepts an already-constructed supabase server client to avoid double-creation.
 */
export async function awardPoints(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string,
  pitchId: string | null,
  action: string
): Promise<{ newTotal: number; badge: typeof BADGES[0] | null; justUnlocked: boolean }> {
  const pts = POINT_VALUES[action] ?? 0
  if (pts === 0) return { newTotal: 0, badge: null, justUnlocked: false }

  // Log the transaction
  await supabase.from('pitch_point_transactions').insert({
    user_id:  userId,
    pitch_id: pitchId,
    action,
    points:   pts,
  })

  // Read current totals
  const { data: existing } = await supabase
    .from('user_pitch_points')
    .select('total_points, badge_slug')
    .eq('user_id', userId)
    .maybeSingle()

  const prevTotal    = existing?.total_points ?? 0
  const prevBadge    = existing?.badge_slug ?? null
  const newTotal     = prevTotal + pts
  const badge        = resolveBadge(newTotal)
  const justUnlocked = badge !== null && badge.slug !== prevBadge

  await supabase.from('user_pitch_points').upsert({
    user_id:     userId,
    total_points: newTotal,
    badge_slug:  badge?.slug  ?? null,
    badge_title: badge?.title ?? null,
    badge_emoji: badge?.emoji ?? null,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return { newTotal, badge, justUnlocked }
}
