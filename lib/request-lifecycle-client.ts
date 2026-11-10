// Browser-side wrapper for the staff lifecycle routes. It returns only a fixed, safe message: the route's
// own fixed text when it is short, otherwise a generic one. Raw response bodies and errors are never
// exposed or logged.

import { safeMessage } from '@/lib/request-lifecycle-ui'

export type LifecycleRoute = 'claim' | 'release' | 'reassign' | 'status' | 'notes'
export type CallResult = { ok: true } | { ok: false; status: number; message: string }

export const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
export const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again."

type FetchLike = typeof fetch

/** 404 and 409 mean the page is out of date: close the sheet, show the message, refresh in the background. */
export const shouldCloseSheet = (status: number): boolean => status === 404 || status === 409

export async function callLifecycle(
  requestId: string,
  route: LifecycleRoute,
  body?: Record<string, unknown>,
  fetchImpl: FetchLike = fetch
): Promise<CallResult> {
  try {
    const res = await fetchImpl(`/api/v1/admin/requests/${encodeURIComponent(requestId)}/${route}`, {
      method: 'POST',
      cache: 'no-store',
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    if (res.ok) return { ok: true }
    const json = await res.json().catch(() => null)
    return { ok: false, status: res.status, message: safeMessage(json?.error) ?? GENERIC_MESSAGE }
  } catch {
    return { ok: false, status: 0, message: NETWORK_MESSAGE }
  }
}

export interface AssignableOwner { id: string; name: string }
export type OwnersResult = { ok: true; owners: AssignableOwner[] } | { ok: false; message: string }

/** Keeps only {id, name} for each owner, whatever else the response carries. */
export async function loadAssignableOwners(fetchImpl: FetchLike = fetch, signal?: AbortSignal): Promise<OwnersResult> {
  try {
    const res = await fetchImpl('/api/v1/admin/requests/assignable-owners', { cache: 'no-store', signal })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success || !Array.isArray(json.data?.owners)) {
      return { ok: false, message: safeMessage(json?.error) ?? GENERIC_MESSAGE }
    }
    const owners: AssignableOwner[] = []
    for (const o of json.data.owners as unknown[]) {
      const r = (o ?? {}) as { id?: unknown; name?: unknown }
      if (typeof r.id === 'string' && r.id !== '') {
        owners.push({ id: r.id, name: typeof r.name === 'string' && r.name.trim() !== '' ? r.name.trim() : 'Staff member' })
      }
    }
    return { ok: true, owners }
  } catch {
    return { ok: false, message: NETWORK_MESSAGE }
  }
}
