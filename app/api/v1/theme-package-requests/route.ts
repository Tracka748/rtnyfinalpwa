import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { parseGuestCount, projectReservation, projectSnapshotSummary } from '@/lib/theme-package-public'
import { PUBLIC_PAGE } from '@/lib/theme-package-public-api'
import { validateOffsetQuery } from '@/lib/theme-package-public-validation'

// The caller's own package requests, newest first.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth.error) return auth.response

  try {
    const q = validateOffsetQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)
    const { offset } = q.value

    const { data: rows, error } = await createSupabaseAdmin()
      .from('plan_requests')
      .select('id, status, created_at, event_date, guest_count, request_kind, package_snapshot')
      .eq('user_id', auth.userId)
      .eq('request_source', 'theme_package')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PUBLIC_PAGE)
    if (error) return mapDbError(error, 'theme-package-requests GET')

    const hasMore = (rows?.length ?? 0) > PUBLIC_PAGE
    const requests = (rows ?? []).slice(0, PUBLIC_PAGE).map((r: {
      id: string; status: string | null; created_at: string | null; event_date: string | null
      guest_count: string | null; request_kind: string | null; package_snapshot: unknown
    }) => {
      const summary = projectSnapshotSummary(r.package_snapshot)
      return {
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        event_date: r.event_date,
        guest_count: parseGuestCount(r.guest_count),
        request_kind: r.request_kind,
        package: summary.package,
        listed_subtotal: summary.listed_subtotal,
        unpriced_items: summary.unpriced_items,
        reservation: projectReservation(r.package_snapshot),
      }
    })

    return ok({ requests, has_more: hasMore, next_offset: hasMore ? offset + PUBLIC_PAGE : null })
  } catch (err) {
    return mapDbError(err, 'theme-package-requests GET')
  }
}
