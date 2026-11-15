// Server-only read of a user's saved day plans for the dashboard. day_plans has RLS on and no
// policies, so this uses the service-role client and filters by the session user's id, which the
// caller must take from the session. Logos and covers come from public.businesses by business_id
// (http(s) only), never from the plan data. Fails soft: any error shows an empty list rather than
// breaking the dashboard.

import { attachBusinessImages, businessImageMap, normalizeSavedPlans, type SavedPlanView } from '@/lib/day-plan'

type AdminLike = { from: (table: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function loadSavedDayPlans(admin: AdminLike, userId: string, limit = 5): Promise<SavedPlanView[]> {
  try {
    const { data, error } = await admin
      .from('day_plans')
      .select('id, plan_date, stops, total_estimated_spend, total_duration_minutes, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('[day-plans] read failed: code=' + (typeof error.code === 'string' ? error.code : 'unknown'))
      return []
    }
    // normalizeSavedPlans never carries image URLs over from the stored plan.
    const plans = normalizeSavedPlans(data)
    const ids = [...new Set(plans.flatMap(p => p.stops.map(s => s.business_id)).filter((x): x is string => !!x))]
    if (ids.length === 0) return plans

    const res = await admin.from('businesses').select('id, logo_url, cover_image_url').in('id', ids)
    if (res.error) {
      console.error('[day-plans] image lookup failed: code=' + (typeof res.error.code === 'string' ? res.error.code : 'unknown'))
      return plans
    }
    return attachBusinessImages(plans, businessImageMap(res.data))
  } catch {
    console.error('[day-plans] read threw')
    return []
  }
}
