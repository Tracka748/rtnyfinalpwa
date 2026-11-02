// lib/authz.ts
// Route-level authorization for routes that use createSupabaseAdmin().
// Anon/authenticated roles have no grants on the package, catalog, recipient and
// quote tables, so these checks are the only protection. Identity comes solely from
// the session cookie via auth.getUser(); client-sent roles, headers and ids are never read.
// Everything fails closed: any error or unexpected value denies, and Postgres error
// text is logged server-side only.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// Approval and request-changes routes must use requireAdmin, not a capability:
// the DB trigger (tpv_guard) requires the reviewer to be an admin.
export const CAPABILITIES = {
  PACKAGES_VIEW: 'packages.view',
  PACKAGES_MANAGE: 'packages.manage',
  CATALOG_VIEW: 'catalog.view',
  EVENTS_REQUESTS_VIEW: 'events.requests.view',
  EVENTS_REQUESTS_MANAGE: 'events.requests.manage',
  PARTNERS_QUOTES_ENTER: 'partners.quotes.enter',
  BIRTHDAY_LEADS_MANAGE: 'birthday.leads.manage',
} as const

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES]

export const ACCESS_LEVELS = ['read_only', 'allow', 'manage'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

const KNOWN_CAPABILITIES: ReadonlySet<string> = new Set(Object.values(CAPABILITIES))
const KNOWN_LEVELS: ReadonlySet<string> = new Set(ACCESS_LEVELS)

type AuthOk = { error: false; response: null; userId: string }
type AuthFail = { error: true; response: NextResponse; userId: null }
export type AuthResult = AuthOk | AuthFail

function deny(status: 401 | 403, message: string): AuthFail {
  return {
    error: true,
    response: NextResponse.json({ success: false, error: message }, { status }),
    userId: null,
  }
}

function logFailure(scope: string, err: unknown) {
  const e = err as { code?: string; message?: string } | null
  console.error(`[authz] ${scope}:`, e?.code ?? '', e?.message ?? String(err))
}

/**
 * Verifies the caller's session. `request` is accepted for a stable route signature
 * but is deliberately not read: identity comes from the cookie session only.
 */
export async function requireUser(_request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user?.id) return deny(401, 'Not authenticated')
    return { error: false, response: null, userId: user.id }
  } catch (err) {
    logFailure('requireUser', err)
    return deny(401, 'Not authenticated')
  }
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireUser(request)
  if (auth.error) return auth
  try {
    const { data, error } = await createSupabaseAdmin().rpc('tp_is_admin', {
      p_user_id: auth.userId,
    })
    if (error) {
      logFailure('requireAdmin rpc tp_is_admin', error)
      return deny(403, 'Admin access required')
    }
    return data === true ? auth : deny(403, 'Admin access required')
  } catch (err) {
    logFailure('requireAdmin', err)
    return deny(403, 'Admin access required')
  }
}

/** Admins always pass (specialist_can resolves admin to 'manage'). */
export async function requireCapability(
  request: NextRequest,
  capability: Capability,
  level: AccessLevel = 'allow'
): Promise<AuthResult> {
  if (!KNOWN_CAPABILITIES.has(capability) || !KNOWN_LEVELS.has(level)) {
    console.error(`[authz] requireCapability misuse: capability=${String(capability)} level=${String(level)}`)
    return deny(403, 'Forbidden')
  }
  const auth = await requireUser(request)
  if (auth.error) return auth
  try {
    const { data, error } = await createSupabaseAdmin().rpc('specialist_can', {
      p_user_id: auth.userId,
      p_capability: capability,
      p_required: level,
    })
    if (error) {
      logFailure('requireCapability rpc specialist_can', error)
      return deny(403, 'Forbidden')
    }
    return data === true ? auth : deny(403, 'Forbidden')
  } catch (err) {
    logFailure('requireCapability', err)
    return deny(403, 'Forbidden')
  }
}
