// Creates an @alias for a user who has just become special. The database function is idempotent
// (it returns the existing alias if there is one). This never throws and never changes the caller's
// response: a failure is logged and the role or owner change stands. An admin can still set the alias
// by hand through PUT /api/v1/admin/users/[id]/alias.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '@/lib/catalog-validation'

export async function ensureAliasSafe(
  supabase: Pick<SupabaseClient, 'rpc'>,
  userId: unknown,
  route: string
): Promise<void> {
  if (typeof userId !== 'string' || !isUuid(userId)) return

  const log = (e: unknown) => {
    const x = (e ?? {}) as { code?: unknown; message?: unknown }
    console.error('[alias] ensure_alias failed', {
      route,
      user_id: userId,
      code: typeof x.code === 'string' ? x.code : null,
      message: typeof x.message === 'string' ? x.message : String(e),
    })
  }

  try {
    const { error } = await supabase.rpc('ensure_alias', { p_user_id: userId })
    if (error) log(error)
  } catch (err) {
    log(err)
  }
}
