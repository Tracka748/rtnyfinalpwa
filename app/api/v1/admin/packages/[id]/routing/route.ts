import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { isUuid } from '@/lib/catalog-validation'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { readStrictBody } from '@/lib/request-lifecycle-api'
import {
  ROUTING_FIELDS, buildCoordinators, buildCurrentCategory, buildCurrentCurator, coordinatorIds,
  profileIdsToLoad, routingDbError, validateRoutingPatch,
  type CategoryRow, type ProfileNameRow,
} from '@/lib/package-routing'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }
type Db = ReturnType<typeof createSupabaseAdmin>

function dbFail(err: unknown, scope: string): NextResponse {
  const { status, message } = routingDbError(err, scope)
  return failNoStore(status, message)
}

async function readRouting(supabase: Db, id: string) {
  return supabase.from('theme_packages').select('id, category_id, curator_id').eq('id', id).maybeSingle()
}

// GET: the package's category and curator, plus what an admin can pick from. Admin only.
// Pickers: active categories (id, key, label) and eligible coordinators (id, display name only).
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }

  const { id } = await params
  if (!isUuid(id)) return failNoStore(400, 'Invalid package id')

  try {
    const supabase = createSupabaseAdmin()
    const [pkg, cats, eligible] = await Promise.all([
      readRouting(supabase, id),
      supabase.from('request_categories').select('id, key, label').eq('active', true).order('label', { ascending: true }),
      supabase.rpc('request_eligible_coordinators'),
    ])
    if (pkg.error) throw pkg.error
    if (cats.error) throw cats.error
    if (eligible.error) throw eligible.error
    if (!pkg.data) return failNoStore(404, 'Package not found')

    const eligibleIds = coordinatorIds(eligible.data as Array<{ coordinator_id: string }> | null)
    const nameIds = profileIdsToLoad(eligibleIds, pkg.data.curator_id)

    const [profilesRes, categoryRes] = await Promise.all([
      nameIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name').in('id', nameIds)
        : Promise.resolve({ data: [] as ProfileNameRow[], error: null }),
      pkg.data.category_id
        ? supabase.from('request_categories').select('id, key, label, active').eq('id', pkg.data.category_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (profilesRes.error) throw profilesRes.error
    if (categoryRes.error) throw categoryRes.error
    const profiles = (profilesRes.data ?? []) as ProfileNameRow[]

    return okNoStore({
      category_id: pkg.data.category_id ?? null,
      curator_id: pkg.data.curator_id ?? null,
      current_category: buildCurrentCategory(categoryRes.data as CategoryRow | null),
      current_curator: buildCurrentCurator(pkg.data.curator_id ?? null, eligibleIds, profiles),
      categories: cats.data ?? [],
      coordinators: buildCoordinators(eligibleIds, profiles),
    })
  } catch (err) {
    return dbFail(err, 'GET')
  }
}

// PATCH { category_id?, curator_id? }: each a uuid or null (clear). Only keys that are sent change.
// The database trigger checks that the category is active and the curator can manage requests.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }

  const { id } = await params
  if (!isUuid(id)) return failNoStore(400, 'Invalid package id')

  const read = await readStrictBody(request, ROUTING_FIELDS)
  if (!read.ok) return read.response
  const v = validateRoutingPatch(read.body)
  if (!v.ok) return failNoStore(400, v.error)

  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('theme_packages').update(v.value).eq('id', id).select('id, category_id, curator_id').maybeSingle()
    if (error) throw error
    if (!data) return failNoStore(404, 'Package not found')
    return okNoStore({ category_id: data.category_id ?? null, curator_id: data.curator_id ?? null })
  } catch (err) {
    return dbFail(err, 'PATCH')
  }
}
