import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { isUuid } from '@/lib/catalog-validation'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { readStrictBody } from '@/lib/request-lifecycle-api'
import { validateAlias } from '@/lib/alias-validation'
import { aliasDbError } from '@/lib/alias-api'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }
type Db = ReturnType<typeof createSupabaseAdmin>

async function userExists(supabase: Db, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle()
  if (error) throw error
  return !!data
}

// GET: the user's alias (or null) and whether they are a special user. Nothing else about the profile.
export async function GET(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }

  const { id } = await params
  if (!isUuid(id)) return failNoStore(400, 'Invalid user id')

  try {
    const supabase = createSupabaseAdmin()
    if (!(await userExists(supabase, id))) return failNoStore(404, 'User not found')

    const [aliasRes, specialRes] = await Promise.all([
      supabase.from('user_aliases').select('alias, updated_at').eq('user_id', id).maybeSingle(),
      supabase.rpc('is_special_user', { p_user_id: id }),
    ])
    if (aliasRes.error) throw aliasRes.error
    if (specialRes.error) throw specialRes.error

    return okNoStore({
      user_id: id,
      alias: aliasRes.data?.alias ?? null,
      updated_at: aliasRes.data?.updated_at ?? null,
      is_special: specialRes.data === true,
    })
  } catch (err) {
    return aliasDbError(err, 'GET')
  }
}

// PUT { alias }: creates or renames. updated_by is the admin's session id, never read from the body.
export async function PUT(request: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }

  const { id } = await params
  if (!isUuid(id)) return failNoStore(400, 'Invalid user id')

  const read = await readStrictBody(request, ['alias'])
  if (!read.ok) return read.response
  const v = validateAlias(read.body.alias)
  if (!v.ok) return failNoStore(400, v.error)

  try {
    const supabase = createSupabaseAdmin()
    if (!(await userExists(supabase, id))) return failNoStore(404, 'User not found')

    const { data, error } = await supabase
      .from('user_aliases')
      .upsert({ user_id: id, alias: v.alias, updated_by: auth.userId }, { onConflict: 'user_id' })
      .select('user_id, alias, updated_at')
      .single()
    if (error) throw error

    return okNoStore({ user_id: data.user_id, alias: data.alias, updated_at: data.updated_at })
  } catch (err) {
    return aliasDbError(err, 'PUT')
  }
}
