import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import {
  NOTE_MAX, lifecycleError, parseText, parseUuid, projectResult, readStrictBody,
} from '@/lib/request-lifecycle-api'

// Add a staff note (owner or admin). Queues no notification, so no outbox run.
// KNOWN RISK: this is not idempotent. A double submit stores two notes (two activity rows).
// There is deliberately no rate limit or de-duplication yet; the UI should disable the button while sending.
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

    const body = await readStrictBody(request, ['note'])
    if (!body.ok) return body.response
    const note = parseText('note', body.body.note, { required: true, max: NOTE_MAX })
    if (!note.ok) return failNoStore(400, note.error)

    const { data, error } = await createSupabaseAdmin().rpc('request_add_note', {
      p_actor: auth.userId,
      p_request_id: id,
      p_note: note.value as string,
    })
    if (error) return lifecycleError(error, 'notes', id)
    return okNoStore(projectResult(data))
  } catch (err) {
    return lifecycleError(err, 'notes', id)
  }
}
