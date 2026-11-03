import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin-auth'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { validateAttachBody } from '@/lib/feed-package-cards'
import { isPackageFeaturable } from '@/lib/feed-package-cards-api'

// Attach (uuid) or detach (null) a theme package on a feed card. Changes no other column.
// Same admin check as the existing feed-card admin routes.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkIsAdmin()
  if (adminCheck.error) return adminCheck.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid feed card id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateAttachBody(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()

    // Fail early with our message; the feed_cards_package_guard trigger is the backstop.
    if (v.value.theme_package_id && !(await isPackageFeaturable(supabase, v.value.theme_package_id))) {
      return fail(400, 'This package is not live and cannot be featured')
    }

    const { data, error } = await supabase
      .from('feed_cards')
      .update({ theme_package_id: v.value.theme_package_id })
      .eq('id', id)
      .select('id, theme_package_id')
      .maybeSingle()
    if (error) return mapDbError(error, 'admin/feed-cards/[id]/package PUT') // trigger P0001 -> 400 with its message
    if (!data) return fail(404, 'Feed card not found')

    return ok({ card: data })
  } catch (err) {
    return mapDbError(err, 'admin/feed-cards/[id]/package PUT')
  }
}
