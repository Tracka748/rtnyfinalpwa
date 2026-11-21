import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { failNoStore, okNoStore } from '@/lib/request-inbox-api'
import { buildHealthView, parseHealth } from '@/lib/outbox-health'

export const dynamic = 'force-dynamic'

const codeOf = (e: unknown) => {
  const c = (e as { code?: unknown } | null)?.code
  return typeof c === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(c) ? c : 'unknown'
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) { auth.response.headers.set('Cache-Control', 'no-store'); return auth.response }
  try {
    const { data, error } = await createSupabaseAdmin().rpc('request_notifications_health')
    if (error) {
      console.error(`[outbox-health] health: code=${codeOf(error)}`)
      return failNoStore(500, 'Could not load delivery health')
    }
    const raw = parseHealth(data)
    if (!raw) {
      console.error('[outbox-health] health: unexpected shape')
      return failNoStore(500, 'Could not load delivery health')
    }
    return okNoStore({ health: buildHealthView(raw, Date.now()) })
  } catch {
    console.error('[outbox-health] health: failed')
    return failNoStore(500, 'Could not load delivery health')
  }
}
