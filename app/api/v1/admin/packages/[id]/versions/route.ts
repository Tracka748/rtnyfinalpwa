import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'

const OPEN = ['draft', 'in_review', 'needs_changes']
const OPEN_DRAFT_MESSAGE = 'This package already has an open draft'

// New draft copied from the live version. The request body is not read.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_MANAGE, 'allow')
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid package id')

    const supabase = createSupabaseAdmin()
    const [pkgRes, openRes] = await Promise.all([
      supabase.from('theme_packages').select('id').eq('id', id).maybeSingle(),
      supabase.from('theme_package_versions').select('id').eq('package_id', id).in('status', OPEN).limit(1),
    ])
    if (pkgRes.error) return mapDbError(pkgRes.error, 'packages/[id]/versions POST package')
    if (openRes.error) return mapDbError(openRes.error, 'packages/[id]/versions POST open check')
    if (!pkgRes.data) return fail(404, 'Package not found')
    if ((openRes.data ?? []).length > 0) return fail(409, OPEN_DRAFT_MESSAGE)

    // p_created_by is always the verified session user.
    const { data, error } = await supabase.rpc('theme_package_create_draft', {
      p_package_id: id,
      p_created_by: auth.userId,
    })
    if (error) {
      // Lost a race with another create: the one-open-version unique index fired.
      if (error.code === '23505') return fail(409, OPEN_DRAFT_MESSAGE)
      return mapDbError(error, 'packages/[id]/versions POST')
    }
    return ok({ version_id: data }, 201)
  } catch (err) {
    return mapDbError(err, 'packages/[id]/versions POST')
  }
}
