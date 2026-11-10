import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, inboxError, okNoStore, validateInboxListQuery } from '@/lib/request-inbox-api'

// The actor is always the session user; visibility and contact redaction are enforced in the DB.
export async function GET(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const q = validateInboxListQuery(new URL(request.url).searchParams)
    if (!q.ok) return failNoStore(400, q.error)

    const { data, error } = await createSupabaseAdmin().rpc('request_inbox_list', {
      p_actor: auth.userId,
      p_scope: q.value.scope,
      p_status: q.value.status ?? undefined,
      p_limit: q.value.limit,
      p_offset: q.value.offset,
    })
    if (error) return inboxError(error, 'list')

    const rows: Array<Record<string, unknown> & { total_count: number }> = data ?? []
    return okNoStore({
      requests: rows.map(({ total_count: _total, ...row }) => row),
      total_count: rows.length ? Number(rows[0].total_count) : 0,
      limit: q.value.limit,
      offset: q.value.offset,
    })
  } catch (err) {
    return inboxError(err, 'list')
  }
}
