import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { transitionVersion } from '@/lib/package-api'
import { validateRevisionBody } from '@/lib/package-validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_MANAGE, 'allow')
  if (auth.error) return auth.response

  try {
    const { id, versionId } = await params
    if (!isUuid(id) || !isUuid(versionId)) return fail(400, 'Invalid id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateRevisionBody(parsed.body)
    if (!v.ok) return fail(400, v.error)

    // The audit trigger refuses a status change without updated_by.
    return await transitionVersion(createSupabaseAdmin(), {
      packageId: id,
      versionId,
      expectedRevision: v.value.expected_revision,
      from: ['in_review'],
      patch: { status: 'draft', updated_by: auth.userId },
      verb: 'withdrawn',
      scope: 'version withdraw POST',
    })
  } catch (err) {
    return mapDbError(err, 'version withdraw POST')
  }
}
