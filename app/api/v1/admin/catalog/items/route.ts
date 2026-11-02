import { NextRequest } from 'next/server'
import { CAPABILITIES, requireAdmin, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, fetchAllRows, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { validateCreateItem, validateItemListQuery } from '@/lib/catalog-validation'

const ITEM_COLUMNS =
  'id, key, name, description, item_type, occasions, image_url, status, created_by, approved_by, approved_at, created_at, updated_at'
const PAGE = 200

export async function GET(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.CATALOG_VIEW, 'read_only')
  if (auth.error) return auth.response

  try {
    const q = validateItemListQuery(request.nextUrl.searchParams)
    if (!q.ok) return fail(400, q.error)
    const { offset } = q.value

    const supabase = createSupabaseAdmin()
    let query = supabase
      .from('catalog_items')
      .select(ITEM_COLUMNS)
      .order('name')
      .order('id')
      .range(offset, offset + PAGE) // PAGE + 1 rows: the extra one tells us there is more
    if (q.value.status) query = query.eq('status', q.value.status)
    if (q.value.item_type) query = query.eq('item_type', q.value.item_type)

    const { data: rows, error } = await query
    if (error) return mapDbError(error, 'items GET')

    const hasMore = (rows?.length ?? 0) > PAGE
    const nextOffset = hasMore ? offset + PAGE : null
    const items: { id: string }[] = (rows ?? []).slice(0, PAGE)
    if (items.length === 0) return ok({ items: [], has_more: false, next_offset: null })
    const ids = items.map(i => i.id)

    const [themeRows, themeList, linkRows] = await Promise.all([
      fetchAllRows<{ catalog_item_id: string; theme_id: string }>((from, to) =>
        supabase.from('catalog_item_themes').select('catalog_item_id, theme_id')
          .in('catalog_item_id', ids).order('catalog_item_id').order('theme_id').range(from, to)),
      supabase.from('themes').select('id, name'),
      fetchAllRows<{ id: string; catalog_item_id: string }>((from, to) =>
        supabase.from('catalog_item_services').select('id, catalog_item_id')
          .in('catalog_item_id', ids).eq('status', 'approved').order('id').range(from, to)),
    ])
    const aggError = themeRows.error ?? themeList.error ?? linkRows.error
    if (aggError) return mapDbError(aggError, 'items GET aggregate')

    const themeName = new Map<string, string>((themeList.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
    const themesByItem = new Map<string, { id: string; name: string }[]>()
    for (const r of themeRows.data ?? []) {
      const list = themesByItem.get(r.catalog_item_id) ?? []
      list.push({ id: r.theme_id, name: themeName.get(r.theme_id) ?? '' })
      themesByItem.set(r.catalog_item_id, list)
    }
    const linkCount = new Map<string, number>()
    for (const r of linkRows.data ?? []) linkCount.set(r.catalog_item_id, (linkCount.get(r.catalog_item_id) ?? 0) + 1)

    return ok({
      items: items.map(i => ({
        ...i,
        themes: themesByItem.get(i.id) ?? [],
        approved_link_count: linkCount.get(i.id) ?? 0,
      })),
      has_more: hasMore,
      next_offset: nextOffset,
    })
  } catch (err) {
    return mapDbError(err, 'items GET')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.response

  try {
    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateCreateItem(parsed.body)
    if (!v.ok) return fail(400, v.error)

    // created_by / approved_by come only from the verified session.
    const row = {
      ...v.value,
      created_by: auth.userId,
      approved_by: v.value.status === 'active' ? auth.userId : null,
    }
    const { data, error } = await createSupabaseAdmin()
      .from('catalog_items').insert(row).select(ITEM_COLUMNS).single()
    if (error) return mapDbError(error, 'items POST')
    return ok({ item: data }, 201)
  } catch (err) {
    return mapDbError(err, 'items POST')
  }
}
