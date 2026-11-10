import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { isUuid } from '@/lib/catalog-validation'
import { failNoStore, inboxError, okNoStore } from '@/lib/request-inbox-api'

// Marks the caller's own notifications for this request as read. Reads no body.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_VIEW, 'allow')
  if (auth.error) return auth.response

  try {
    const { id } = await params
    if (!isUuid(id)) return failNoStore(400, 'Invalid request id')

    const { data, error } = await createSupabaseAdmin().rpc('request_inbox_mark_read', {
      p_actor: auth.userId,
      p_request_id: id,
    })
    if (error) return inboxError(error, 'mark-read')
    return okNoStore({ updated: Number(data ?? 0) })
  } catch (err) {
    return inboxError(err, 'mark-read')
  }
}
