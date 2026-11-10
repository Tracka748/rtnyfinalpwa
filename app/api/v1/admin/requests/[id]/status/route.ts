import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import {
  REASON_MAX, lifecycleError, parseStatusTarget, parseText, parseUuid, projectResult,
  readStrictBody, scheduleOutboxSafe,
} from '@/lib/request-lifecycle-api'

// Set status (including the admin reopen of a closed request). The database decides who may do what.
// The outbox runs after every successful call; it only sends when a notification row was queued.
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

    const body = await readStrictBody(request, ['to', 'reason'])
    if (!body.ok) return body.response
    const to = parseStatusTarget(body.body.to)
    if (!to.ok) return failNoStore(400, to.error)
    // A reopen needs a reason; the database enforces that, so it is optional here.
    const reason = parseText('reason', body.body.reason, { required: false, max: REASON_MAX })
    if (!reason.ok) return failNoStore(400, reason.error)

    const { data, error } = await createSupabaseAdmin().rpc('request_set_status', {
      p_actor: auth.userId,
      p_request_id: id,
      p_to: to.value,
      p_reason: reason.value ?? undefined,
    })
    if (error) return lifecycleError(error, 'status', id)

    scheduleOutboxSafe(id)
    return okNoStore(projectResult(data))
  } catch (err) {
    return lifecycleError(err, 'status', id)
  }
}
