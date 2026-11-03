import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { parseGuestCount, projectSnapshot, projectSnapshotSummary } from '@/lib/theme-package-public'

const notFound = () => fail(404, 'Request not found')

// Own request only. Someone else's id, a non-package request and a malformed id all answer 404 (never 403).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request)
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return notFound()

    const { data, error } = await createSupabaseAdmin()
      .from('plan_requests')
      .select('id, status, created_at, event_date, guest_count, budget_range, notes, package_snapshot')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .eq('request_source', 'theme_package')
      .maybeSingle()
    if (error) return mapDbError(error, 'theme-package-requests/[id] GET')
    if (!data) return notFound()

    return ok({
      request: {
        id: data.id,
        status: data.status,
        created_at: data.created_at,
        event_date: data.event_date,
        guest_count: parseGuestCount(data.guest_count),
        budget_range: data.budget_range,
        notes: data.notes,
        package: projectSnapshotSummary(data.package_snapshot).package,
        snapshot: projectSnapshot(data.package_snapshot),
      },
    })
  } catch (err) {
    return mapDbError(err, 'theme-package-requests/[id] GET')
  }
}
