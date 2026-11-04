import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { checkRequestAbuse, getVerifiedEmail, resolveLivePackage } from '@/lib/theme-package-public-api'
import { isSlugKey, validateCreateRequestBody } from '@/lib/theme-package-public-validation'

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

    const { data, error } = await supabase.rpc('theme_package_create_request', {
      p_user_id: auth.userId,
      p_version_id: live.version.id,
      p_selection: v.value.selection,
      p_event_date: v.value.event_date,
      p_guest_count: v.value.guest_count,
      p_budget_range: v.value.budget_range, // null when the form left it out
      p_notes: v.value.notes,
      p_contact_email: email,
    })
    if (error) return mapDbError(error, 'theme-packages/[key]/requests POST')

    // The function takes event_type from the package occasion. When the customer typed their own,
    // set it on the row just created: scoped to this request id, this user and package requests, and
    // writing event_type only. Package, version, pricing and snapshot are untouched. If this write
    // fails the request still exists with the occasion as its event type, so log and still succeed.
    const eventType = v.value.event_type
    if (typeof data === 'string' && eventType && eventType !== live.pkg.occasion) {
      const { data: updated, error: eventTypeErr } = await supabase
        .from('plan_requests')
        .update({ event_type: eventType })
        .eq('id', data)
        .eq('user_id', auth.userId)
        .eq('request_source', 'theme_package')
        .select('id')
      if (eventTypeErr || (updated ?? []).length !== 1) {
        console.error('[theme-packages] request created but event_type was not saved',
          data, eventTypeErr?.code ?? '', eventTypeErr?.message ?? 'no row updated')
      }
    }

    return ok({ request_id: data }, 201)
  } catch (err) {
    return mapDbError(err, 'theme-packages/[key]/requests POST')
  }
}
