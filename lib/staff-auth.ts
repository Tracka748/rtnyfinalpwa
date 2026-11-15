// Server-side access decision for the staff layout (app/(staff)/admin/layout.tsx).
//
// This is only the UX layer: every API route keeps its own requireCapability check, which is the real
// enforcement. It fails closed: any error, exception or non-`true` answer means "denied".
// The capability and level match the inbox API routes (events.requests.view at 'allow'), so a user the
// layout lets in is a user the routes let in.

import { CAPABILITIES } from '@/lib/authz'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export type StaffAccess =
  | { state: 'signed_out' }
  | { state: 'denied' }
  | { state: 'allowed'; isAdmin: boolean; email: string | null }

/** Pure decision. Only a real session plus an exact `true` for the capability is allowed. */
export function decideStaffAccess(input: {
  userId: string | null
  canView: unknown
  isAdmin: unknown
  email?: string | null
}): StaffAccess {
  if (!input.userId) return { state: 'signed_out' }
  if (input.canView !== true) return { state: 'denied' }
  return { state: 'allowed', isAdmin: input.isAdmin === true, email: input.email ?? null }
}

const logCode = (scope: string, err: unknown) => {
  const code = (err as { code?: unknown } | null)?.code
  console.error(`[staff-auth] ${scope}: code=${typeof code === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(code) ? code : 'unknown'}`)
}

export async function getStaffAccess(): Promise<StaffAccess> {
  let userId: string | null = null
  let email: string | null = null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user?.id) {
      userId = data.user.id
      email = data.user.email ?? null
    }
  } catch (err) {
    logCode('session lookup', err)
  }
  if (!userId) return decideStaffAccess({ userId: null, canView: false, isAdmin: false })

  let canView: unknown = false
  let isAdmin: unknown = false
  try {
    const admin = createSupabaseAdmin()
    const view = await admin.rpc('specialist_can', {
      p_user_id: userId,
      p_capability: CAPABILITIES.EVENTS_REQUESTS_VIEW,
      p_required: 'allow',
    })
    if (view.error) {
      logCode('capability check', view.error)
    } else {
      canView = view.data
    }
    if (canView === true) {
      // Only chooses which shell to render; an error means "not admin".
      const adminCheck = await admin.rpc('tp_is_admin', { p_user_id: userId })
      if (adminCheck.error) logCode('admin check', adminCheck.error)
      else isAdmin = adminCheck.data
    }
  } catch (err) {
    logCode('capability check', err)
    canView = false
  }
  return decideStaffAccess({ userId, canView, isAdmin, email })
}
