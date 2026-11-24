// Adds each user's @alias and a "special user" flag to the admin users list. Server side only.
//
// is_special mirrors public.is_special_user (supabase/migrations/20261122100000_user_aliases.sql), but
// computed in memory from three batched reads instead of one rpc per user. A test keeps the role list
// and the assignment rules in sync with that SQL function.

import type { AdminClient } from '@/lib/catalog-api'
import { chunk } from '@/lib/catalog-guards'

export const SPECIAL_ROLES: readonly string[] = ['admin', 'promoter', 'organizer']

export interface AliasRow { user_id: string; alias: string }
export interface OwnerRow { owner_id: string | null }
export interface AssignmentRow {
  user_id: string
  status: string
  starts_at: string | null
  expires_at: string | null
}

interface ProfileLike { id: string; role?: string | null; is_organizer?: boolean | null }

/** admin / promoter / organizer role, is_organizer, owner of a partner, or an active, unexpired specialist assignment. */
export function isSpecialUser(
  p: ProfileLike,
  ownerIds: ReadonlySet<string>,
  assignments: readonly AssignmentRow[],
  now: Date
): boolean {
  if (p.role && SPECIAL_ROLES.includes(p.role)) return true
  if (p.is_organizer === true) return true
  if (ownerIds.has(p.id)) return true
  return assignments.some(a =>
    a.user_id === p.id &&
    a.status === 'active' &&
    (a.starts_at === null || new Date(a.starts_at) <= now) &&
    (a.expires_at === null || new Date(a.expires_at) > now))
}

/** Same rows in the same order, every field kept, plus `alias` (string or null) and `is_special`. */
export function mergeAliasInfo<T extends ProfileLike>(
  profiles: readonly T[],
  aliasRows: readonly AliasRow[],
  ownerIds: ReadonlySet<string>,
  assignments: readonly AssignmentRow[],
  now: Date = new Date()
): Array<T & { alias: string | null; is_special: boolean }> {
  const aliasByUser = new Map(aliasRows.map(r => [r.user_id, r.alias]))
  return profiles.map(p => ({
    ...p,
    alias: aliasByUser.get(p.id) ?? null,
    is_special: isSpecialUser(p, ownerIds, assignments, now),
  }))
}

/**
 * Three parallel batched reads for the given ids (200 ids per query): aliases, partner owners and
 * specialist assignments. No embedded joins. Throws the first database error.
 */
export async function loadAliasData(supabase: AdminClient, ids: readonly string[]) {
  const groups = chunk(ids)
  const [aliasPages, ownerPages, assignmentPages] = await Promise.all([
    Promise.all(groups.map(c => supabase.from('user_aliases').select('user_id, alias').in('user_id', c))),
    Promise.all(groups.map(c => supabase.from('partners').select('owner_id').in('owner_id', c))),
    Promise.all(groups.map(c =>
      supabase.from('user_specialist_assignments').select('user_id, status, starts_at, expires_at').in('user_id', c))),
  ])
  for (const page of [...aliasPages, ...ownerPages, ...assignmentPages]) {
    if (page.error) throw page.error
  }
  const aliasRows = aliasPages.flatMap(p => (p.data ?? []) as AliasRow[])
  const ownerIds = new Set(
    ownerPages.flatMap(p => (p.data ?? []) as OwnerRow[]).flatMap(r => (r.owner_id ? [r.owner_id] : []))
  )
  const assignments = assignmentPages.flatMap(p => (p.data ?? []) as AssignmentRow[])
  return { aliasRows, ownerIds, assignments }
}

/**
 * Adds alias and is_special to the loaded page of users. Never throws: if the lookup fails, only the
 * error code is logged and the rows come back without alias fields, so the caller's response keeps working.
 */
export async function attachAliasInfo<T extends ProfileLike>(
  supabase: AdminClient,
  profiles: readonly T[]
): Promise<Array<T & { alias?: string | null; is_special?: boolean }>> {
  if (profiles.length === 0) return []
  try {
    const { aliasRows, ownerIds, assignments } = await loadAliasData(supabase, profiles.map(p => p.id))
    return mergeAliasInfo(profiles, aliasRows, ownerIds, assignments)
  } catch (err) {
    const raw = (err as { code?: unknown } | null)?.code
    const code = typeof raw === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(raw) ? raw : 'unknown'
    console.error(`[admin-users] alias lookup failed: code=${code}`)
    return [...profiles]
  }
}
