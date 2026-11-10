import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { isUuid } from '@/lib/catalog-validation'
import { failNoStore, inboxError, okNoStore } from '@/lib/request-inbox-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return failNoStore(400, 'Invalid request id')

    const { data, error } = await createSupabaseAdmin().rpc('request_inbox_detail', {
      p_actor: auth.userId,
      p_request_id: id,
    })
    if (error) return inboxError(error, 'detail')
    // null means missing or not visible to this actor: one response for both.
    if (data == null) return failNoStore(404, 'Request not found')

    return okNoStore({ request: data })
  } catch (err) {
    return inboxError(err, 'detail')
  }
}
