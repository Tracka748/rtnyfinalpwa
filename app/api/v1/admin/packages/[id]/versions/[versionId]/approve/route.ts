import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { transitionVersion } from '@/lib/package-api'
import { validateApprove } from '@/lib/package-validation'

// Admin only (no capability). Approval comes from in_review only, never straight from draft.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const { id, versionId } = await params
    if (!isUuid(id) || !isUuid(versionId)) return fail(400, 'Invalid id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateApprove(parsed.body)
    if (!v.ok) return fail(400, v.error)

    // reviewed_by is the verified session user; tpv_guard re-checks that it is an admin.
    return await transitionVersion(createSupabaseAdmin(), {
      packageId: id,
      versionId,
      expectedRevision: v.value.expected_revision,
      from: ['in_review'],
      patch: { status: 'approved', reviewed_by: auth.userId, review_note: v.value.note },
      verb: 'approved',
      scope: 'version approve POST',
    })
  } catch (err) {
    return mapDbError(err, 'version approve POST')
  }
}
