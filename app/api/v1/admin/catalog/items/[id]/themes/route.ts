import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { isUuid, validateThemeIds } from '@/lib/catalog-validation'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return fail(400, 'Invalid item id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateThemeIds(parsed.body)
    if (!v.ok) return fail(400, v.error)
    const desired = v.value.theme_ids

    const supabase = createSupabaseAdmin()
    const { data: item, error: itemErr } = await supabase
      .from('catalog_items').select('id').eq('id', id).maybeSingle()
    if (itemErr) return mapDbError(itemErr, 'items/[id]/themes PUT item')
    if (!item) return fail(404, 'Catalog item not found')

    let themes: { id: string; name: string }[] = []
    if (desired.length > 0) {
      const { data, error } = await supabase
        .from('themes').select('id, name').in('id', desired).eq('active', true)
      if (error) return mapDbError(error, 'items/[id]/themes PUT themes')
      themes = data ?? []
      if (themes.length !== desired.length) return fail(400, 'One or more themes do not exist or are inactive')
    }

    const { data: current, error: curErr } = await supabase
      .from('catalog_item_themes').select('theme_id').eq('catalog_item_id', id)
    if (curErr) return mapDbError(curErr, 'items/[id]/themes PUT current')

    // No transaction in supabase-js: add first, then remove, so a failure leaves a superset, never an empty set.
    const have = new Set<string>((current ?? []).map((r: { theme_id: string }) => r.theme_id))
    const want = new Set(desired)
    const toAdd = desired.filter(t => !have.has(t))
    const toRemove = [...have].filter(t => !want.has(t))

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('catalog_item_themes').insert(toAdd.map(theme_id => ({ catalog_item_id: id, theme_id })))
      if (error) return mapDbError(error, 'items/[id]/themes PUT insert')
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('catalog_item_themes').delete().eq('catalog_item_id', id).in('theme_id', toRemove)
      if (error) return mapDbError(error, 'items/[id]/themes PUT delete')
    }

    return ok({ theme_ids: desired, themes })
  } catch (err) {
    return mapDbError(err, 'items/[id]/themes PUT')
  }
}
