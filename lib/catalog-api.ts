// Shared plumbing for the admin catalog routes: response helpers, the single DB-error
// mapper, JSON body reading, paging past PostgREST's 1000-row cap, owner-name lookup.

import { NextResponse, type NextRequest } from 'next/server'
import type { createSupabaseAdmin } from '@/lib/supabase'

export type AdminClient = ReturnType<typeof createSupabaseAdmin>

export const ok = <T>(data: T, status = 200) => NextResponse.json({ success: true, data }, { status })
export const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** Maps a Postgres/PostgREST error to a response. The real error is logged, never returned. */
export function mapDbError(err: unknown, scope: string): NextResponse {
  const e = (err ?? {}) as { code?: string; message?: string }
  console.error(`[catalog] ${scope}:`, e.code ?? '', e.message ?? String(err))
  switch (e.code) {
    case 'P0001': // our trigger / function `raise exception` messages
      return fail(400, (typeof e.message === 'string' && e.message.slice(0, 200)) || 'Request rejected')
    case 'RT409': // theme_package_save_draft: stale revision (our own message)
      return fail(409, (typeof e.message === 'string' && e.message.slice(0, 200)) || 'This draft was changed by someone else; reload it and try again')
    case '42501':
      return fail(403, 'Forbidden')
    case '23505':
      return fail(409, 'A record with these values already exists')
    case '23503':
    case '23514':
      return fail(400, 'Invalid request')
    default:
      return fail(500, 'Something went wrong')
  }
}

export async function readJson(
  request: NextRequest
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, response: fail(400, 'Request body must be valid JSON') }
  }
}

/** Reads every page of a query (PostgREST silently caps a response at 1000 rows). */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[] | null; error: unknown }> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) return { data: null, error }
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return { data: out, error: null }
  }
}

export interface OwnerRef { partner_id: string | null; vendor_id: string | null }

/** Looks up partner/vendor display names; returns a resolver (partner wins if both are set). */
export async function loadOwnerNames(supabase: AdminClient, services: OwnerRef[]) {
  const partnerIds = [...new Set(services.map(s => s.partner_id).filter((x): x is string => !!x))]
  const vendorIds = [...new Set(services.map(s => s.vendor_id).filter((x): x is string => !!x))]
  const [p, v] = await Promise.all([
    partnerIds.length
      ? supabase.from('partners').select('id, display_name').in('id', partnerIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[], error: null }),
    vendorIds.length
      ? supabase.from('vendors').select('id, name').in('id', vendorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ])
  if (p.error || v.error) throw p.error ?? v.error
  const partners = new Map<string, string>((p.data ?? []).map((r: { id: string; display_name: string }) => [r.id, r.display_name]))
  const vendors = new Map<string, string>((v.data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]))
  return (s: OwnerRef): { owner_type: 'partner' | 'vendor' | null; owner_name: string | null } => {
    if (s.partner_id && partners.has(s.partner_id)) return { owner_type: 'partner', owner_name: partners.get(s.partner_id)! }
    if (s.vendor_id && vendors.has(s.vendor_id)) return { owner_type: 'vendor', owner_name: vendors.get(s.vendor_id)! }
    return { owner_type: null, owner_name: null }
  }
}
