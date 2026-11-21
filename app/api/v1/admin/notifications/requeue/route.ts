import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { readStrictBody } from '@/lib/request-lifecycle-api'
import { parseRequeueBody, parseRequeueResult } from '@/lib/outbox-health'

export const dynamic = 'force-dynamic'

const codeOf = (e: unknown) => {
  const c = (e as { code?: unknown } | null)?.code
  return typeof c === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(c) ? c : 'unknown'
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }

  const read = await readStrictBody(request, ['mode', 'ids'])
  if (!read.ok) return read.response
  const input = parseRequeueBody(read.body)
  if (!input.ok) return failNoStore(400, input.error)

  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = input.value.mode === 'failed'
      ? await supabase.rpc('request_notifications_requeue', { p_actor: auth.userId, p_ids: input.value.ids })
      : await supabase.rpc('request_notifications_requeue_app_url', { p_actor: auth.userId })
    if (error) {
      const code = codeOf(error)
      console.error(`[outbox-health] requeue: code=${code}`)
      if (code === '42501') return failNoStore(403, 'Forbidden')
      if (code === '22023') return failNoStore(400, 'Invalid request')
      return failNoStore(500, 'Something went wrong')
    }
    const result = parseRequeueResult(data)
    if (!result) return failNoStore(500, 'Something went wrong')
    return okNoStore(result)
  } catch {
    console.error('[outbox-health] requeue: failed')
    return failNoStore(500, 'Something went wrong')
  }
}
