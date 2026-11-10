import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import {
  REASON_MAX, lifecycleError, parseText, parseUuid, projectResult, readStrictBody,
} from '@/lib/request-lifecycle-api'

// Release (owner) or unassign (admin): the request returns to the unowned queue. A reason is required.
// Queues no notification, so no outbox run.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_MANAGE, 'allow')
  if (auth.error) return auth.response

  let id = ''
  try {
    const p = parseUuid('id', (await params).id)
    if (!p.ok) return failNoStore(400, 'Invalid request id')
    id = p.value

    const body = await readStrictBody(request, ['reason'])
    if (!body.ok) return body.response
    const reason = parseText('reason', body.body.reason, { required: true, max: REASON_MAX })
    if (!reason.ok) return failNoStore(400, reason.error)

    const { data, error } = await createSupabaseAdmin().rpc('request_release', {
      p_actor: auth.userId,
      p_request_id: id,
      p_reason: reason.value as string,
    })
    if (error) return lifecycleError(error, 'release', id)
    return okNoStore(projectResult(data))
  } catch (err) {
    return lifecycleError(err, 'release', id)
  }
}
