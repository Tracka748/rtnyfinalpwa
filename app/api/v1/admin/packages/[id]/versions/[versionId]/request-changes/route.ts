import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { transitionVersion } from '@/lib/package-api'
import { validateRequestChanges } from '@/lib/package-validation'

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
    const v = validateRequestChanges(parsed.body)
    if (!v.ok) return fail(400, v.error)

    return await transitionVersion(createSupabaseAdmin(), {
      packageId: id,
      versionId,
      expectedRevision: v.value.expected_revision,
      from: ['in_review'],
      patch: { status: 'needs_changes', reviewed_by: auth.userId, review_note: v.value.note },
      verb: 'sent back for changes',
      scope: 'version request-changes POST',
    })
  } catch (err) {
    return mapDbError(err, 'version request-changes POST')
  }
}
