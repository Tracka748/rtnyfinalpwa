import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { okNoStore } from '@/lib/request-inbox-api'
import { lifecycleError, requireAdminActor } from '@/lib/request-lifecycle-api'

const FALLBACK_NAME = 'Staff member'

// Admin only. Who can be assigned a request: ids and display names, nothing else (no emails, no roles).
export async function GET(request: NextRequest) {
  const auth = await requireCapability(request, CAPABILITIES.EVENTS_REQUESTS_MANAGE, 'allow')
  if (auth.error) return auth.response
  const notAdmin = await requireAdminActor(auth.userId)
  if (notAdmin) return notAdmin

  try {
    const supabase = createSupabaseAdmin()
    const { data: eligible, error } = await supabase.rpc('request_eligible_coordinators')
    if (error) return lifecycleError(error, 'assignable owners')

    const rows = (eligible ?? []) as Array<{ coordinator_id: string }>
    const ids: string[] = [...new Set<string>(rows.map(r => r.coordinator_id))]
    if (ids.length === 0) return okNoStore({ owners: [] })

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', ids)
    if (profileError) return lifecycleError(profileError, 'assignable owners profiles')

    const names = new Map<string, string>()
    for (const p of (profiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>) {
      names.set(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim())
    }
    const owners = ids
      .map(id => ({ id, name: names.get(id) || FALLBACK_NAME }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))

    return okNoStore({ owners })
  } catch (err) {
    return lifecycleError(err, 'assignable owners')
  }
}
