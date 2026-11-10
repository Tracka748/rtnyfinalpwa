import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { inboxError, okNoStore } from '@/lib/request-inbox-api'

export async function GET(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const { data, error } = await createSupabaseAdmin().rpc('request_inbox_unread_count', {
      p_actor: auth.userId,
    })
    if (error) return inboxError(error, 'unread-count')
    return okNoStore({ count: Number(data ?? 0) })
  } catch (err) {
    return inboxError(err, 'unread-count')
  }
}
