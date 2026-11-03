// Shared status-transition helper for the admin package routes. One conditional UPDATE does the
// compare-and-set (id + package + expected revision + allowed current statuses); when it matches
// nothing we read the row to say why. DB trigger errors (valid transitions, admin-only approval,
// tpv_validate) come back as P0001 and are mapped to 400 by mapDbError.

import type { NextResponse } from 'next/server'
import { fail, mapDbError, ok, type AdminClient } from '@/lib/catalog-api'

export interface TransitionOptions {
  packageId: string
  versionId: string
  expectedRevision: number
  /** statuses the version may currently be in */
  from: readonly string[]
  /** columns to write, including the new status */
  patch: Record<string, unknown>
  /** past-tense verb for the 409 message, e.g. 'submitted' */
  verb: string
  scope: string
}

const RETURNED = 'id, package_id, version_number, status, revision, updated_at, reviewed_at, review_note'

export async function transitionVersion(supabase: AdminClient, o: TransitionOptions): Promise<NextResponse> {
  const { data, error } = await supabase
    .from('theme_package_versions')
    .update(o.patch)
    .eq('id', o.versionId)
    .eq('package_id', o.packageId)
    .eq('revision', o.expectedRevision)
    .in('status', [...o.from])
    .select(RETURNED)
    .maybeSingle()
  if (error) return mapDbError(error, o.scope)
  if (data) return ok({ version: data })

  const { data: row, error: readErr } = await supabase
    .from('theme_package_versions')
    .select('id, status, revision')
    .eq('id', o.versionId)
    .eq('package_id', o.packageId)
    .maybeSingle()
  if (readErr) return mapDbError(readErr, `${o.scope} read`)
  if (!row) return fail(404, 'Package version not found')
  if (row.revision !== o.expectedRevision) {
    return fail(409, 'This draft was changed since you loaded it; reload it and try again')
  }
  return fail(409, `This version is ${String(row.status).replace(/_/g, ' ')} and cannot be ${o.verb}`)
}
