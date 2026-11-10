import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { projectReservation } from '@/lib/theme-package-public'
import { checkRequestAbuse, getVerifiedEmail, resolveLivePackage } from '@/lib/theme-package-public-api'
import { isSlugKey, validateCreateRequestBody } from '@/lib/theme-package-public-validation'
import { scheduleOutbox } from '@/lib/notifications/outbox'

// Requests are created ONLY by theme_package_create_request. The user id comes from the session,
// the contact email from the account, and every price/vendor/service/snapshot is built server-side.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireUser(request)
  if (auth.error) return auth.response

  try {
    const { key } = await params
    if (!isSlugKey(key)) return fail(404, 'Package not found')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateCreateRequestBody(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const live = await resolveLivePackage(supabase, key)
    if (!live) return fail(404, 'Package not found')
    if (v.value.version_id !== live.version.id) {
      return fail(409, 'This package was updated; reload it and try again')
    }

    // A reservation must fit the package's guest range (date and guest count are already required).
    if (v.value.intent === 'reserve') {
      const { min_guests: min, max_guests: max } = live.version
      if ((min != null && v.value.guest_count < min) || (max != null && v.value.guest_count > max)) {
        return fail(400, "guest count is outside this package's range")
      }
    }

    const abuse = await checkRequestAbuse(supabase, { userId: auth.userId, versionId: live.version.id })
    if (abuse.kind === 'rate_limited') return fail(429, 'Too many requests; please try again later')
    if (abuse.kind === 'duplicate') {
      return NextResponse.json(
        { success: false, error: 'You already sent this request a moment ago', request_id: abuse.requestId },
        { status: 409 }
      )
    }

    const email = await getVerifiedEmail(supabase, auth.userId)
    if (!email) return fail(403, 'A verified email address is required to send a request')

    // The function stores event_type (blank -> the package occasion) and request_kind atomically.
    const { data, error } = await supabase.rpc('theme_package_create_request', {
      p_user_id: auth.userId,
      p_version_id: live.version.id,
      p_selection: v.value.selection,
      p_event_date: v.value.event_date,
      p_guest_count: v.value.guest_count,
      p_budget_range: v.value.budget_range, // null when the form left it out
      p_notes: v.value.notes,
      p_contact_email: email,
      p_event_type: v.value.event_type, // null = the function uses the package occasion
      p_intent: v.value.intent,
    })
    if (error) return mapDbError(error, 'theme-packages/[key]/requests POST')

    // Read the stored row back only to return its allowlisted reservation numbers. If this read
    // fails the request still exists, so log and still succeed.
    const requestId = data as string
    // Notification rows were queued by the plan_requests insert trigger; send them after the response.
    scheduleOutbox(requestId)
    const { data: row, error: readErr } = await supabase
      .from('plan_requests')
      .select('request_kind, package_snapshot')
      .eq('id', requestId)
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (readErr || !row) {
      console.error('[theme-packages] request created but could not be read back',
        requestId, readErr?.code ?? '', readErr?.message ?? 'no row')
    }

    return ok({
      request_id: requestId,
      request_kind: row?.request_kind ?? (v.value.intent === 'reserve' ? 'reserve' : 'custom_quote'),
      reservation: row ? projectReservation(row.package_snapshot) : null,
    }, 201)
  } catch (err) {
    return mapDbError(err, 'theme-packages/[key]/requests POST')
  }
}
