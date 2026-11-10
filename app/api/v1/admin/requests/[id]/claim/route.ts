import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { lifecycleError, parseUuid, projectResult, readStrictBody } from '@/lib/request-lifecycle-api'

// Claim: the session user takes an unowned request. Queues no notification, so no outbox run.
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

    const body = await readStrictBody(request, [])
    if (!body.ok) return body.response

    const { data, error } = await createSupabaseAdmin().rpc('request_claim', {
      p_actor: auth.userId,
      p_request_id: id,
    })
    if (error) return lifecycleError(error, 'claim', id)
    return okNoStore(projectResult(data))
  } catch (err) {
    return lifecycleError(err, 'claim', id)
  }
}
