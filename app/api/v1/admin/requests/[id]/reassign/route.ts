import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import {
  REASON_MAX, lifecycleError, parseText, parseUuid, projectResult, readStrictBody,
  requireAdminActor, scheduleOutboxSafe,
} from '@/lib/request-lifecycle-api'

// Admin only. Assigns an unowned request or reassigns an owned one to {assignee_id}.
// The route reads the current owner only to choose between request_assign and request_reassign; both
// re-check ownership under a row lock in the database. If the owner changed in between, the database
// answers 409 and the route NEVER falls back to the other function.
// A reason is optional when the request is unowned and required when it is owned.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_MANAGE, 'allow')
  if (auth.error) return auth.response
  const notAdmin = await requireAdminActor(auth.userId)
  if (notAdmin) return notAdmin

  let id = ''
  try {
    const p = parseUuid('id', (await params).id)
    if (!p.ok) return failNoStore(400, 'Invalid request id')
    id = p.value

    const body = await readStrictBody(request, ['assignee_id', 'reason'])
    if (!body.ok) return body.response
    const assignee = parseUuid('assignee_id', body.body.assignee_id)
    if (!assignee.ok) return failNoStore(400, assignee.error)
    const reason = parseText('reason', body.body.reason, { required: false, max: REASON_MAX })
    if (!reason.ok) return failNoStore(400, reason.error)

    const supabase = createSupabaseAdmin()
    const { data: row, error: readError } = await supabase
      .from('plan_requests')
      .select('coordinator_id')
      .eq('id', id)
      .maybeSingle()
    if (readError) return lifecycleError(readError, 'reassign read', id)
    if (!row) return failNoStore(404, 'Request not found')

    const owned = row.coordinator_id !== null
    if (owned && !reason.value) return failNoStore(422, 'A reason is required to reassign this request')

    const { data, error } = owned
      ? await supabase.rpc('request_reassign', {
          p_actor: auth.userId,
          p_request_id: id,
          p_new_owner: assignee.value,
          p_reason: reason.value as string,
        })
      : await supabase.rpc('request_assign', {
          p_actor: auth.userId,
          p_request_id: id,
          p_assignee: assignee.value,
          p_reason: reason.value ?? undefined,
        })
    if (error) return lifecycleError(error, owned ? 'reassign' : 'assign', id)

    scheduleOutboxSafe(id)
    return okNoStore(projectResult(data))
  } catch (err) {
    return lifecycleError(err, 'reassign', id)
  }
}
