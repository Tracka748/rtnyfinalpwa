// POST /api/v1/plan/day/save — save the signed-in user's day plan.
// day_plans has RLS enabled and no policies, so the browser cannot write it; this route is the only
// write path. user_id comes from the session only. The body is validated and capped by
// parseSaveBody; totals are recomputed server-side; status is the server constant 'saved'; ids,
// user ids, totals, status and image URLs are never accepted from the client. Errors are fixed messages; Postgres text is never returned or logged.

import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { DAY_PLAN_LIMITS, parseSaveBody, toInsertRow } from '@/lib/day-plan'

// Not exported: a route module may only export route handlers and route config.
const DAY_PLAN_SAVE_ERRORS = {
  invalid: 'Invalid plan',
  limit: 'You have reached the saved plan limit',
  profile: 'Your profile is not ready. Please sign out and back in.',
  failed: 'Could not save your plan',
} as const

const code = (e: unknown) => {
  const c = (e as { code?: unknown } | null)?.code
  return typeof c === 'string' ? c : 'unknown'
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth.error) {
    auth.response.headers.set('Cache-Control', 'no-store')
    return auth.response
  }

  let raw: string
  try { raw = await request.text() } catch { return failNoStore(400, DAY_PLAN_SAVE_ERRORS.invalid) }
  const parsed = parseSaveBody(raw)
  if (!parsed.ok) return failNoStore(parsed.error === 'body is too large' ? 413 : 400, DAY_PLAN_SAVE_ERRORS.invalid)

  try {
    const admin = createSupabaseAdmin()

    const { count, error: countError } = await admin
      .from('day_plans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
    if (countError || typeof count !== 'number') {
      console.error('[day-plan-save] count failed: code=' + code(countError))
      return failNoStore(500, DAY_PLAN_SAVE_ERRORS.failed)
    }
    // Not race-proof (two parallel saves can pass together); a soft cap until real rate limiting exists.
    if (count >= DAY_PLAN_LIMITS.PLANS_PER_USER) return failNoStore(429, DAY_PLAN_SAVE_ERRORS.limit)

    const { data, error } = await admin
      .from('day_plans')
      .insert(toInsertRow(auth.userId, parsed.value))
      .select('id')
      .single()
    if (error) {
      const c = code(error)
      console.error('[day-plan-save] insert failed: code=' + c)
      return c === '23503'
        ? failNoStore(409, DAY_PLAN_SAVE_ERRORS.profile)
        : failNoStore(500, DAY_PLAN_SAVE_ERRORS.failed)
    }
    const id = (data as { id?: unknown } | null)?.id
    if (typeof id !== 'string') {
      console.error('[day-plan-save] insert returned no id')
      return failNoStore(500, DAY_PLAN_SAVE_ERRORS.failed)
    }
    return okNoStore({ id })
  } catch {
    console.error('[day-plan-save] threw')
    return failNoStore(500, DAY_PLAN_SAVE_ERRORS.failed)
  }
}
