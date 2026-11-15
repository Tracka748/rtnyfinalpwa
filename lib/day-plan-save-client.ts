// Browser helper for POST /api/v1/plan/day/save. Never throws, never shows server text:
// every outcome maps to a fixed message defined here.

import type { SavePayload } from '@/lib/day-plan'

export type SaveOutcome =
  | { status: 'saved'; id: string }
  | { status: 'signed_out' }
  | { status: 'limit' }
  | { status: 'profile' }
  | { status: 'error' }

export const SAVE_MESSAGES = {
  error: 'Could not save your plan. Please try again.',
  limit: 'You have reached the limit of 50 saved plans.',
  profile: 'Your profile is not ready. Please sign out and back in.',
} as const

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'status' | 'ok' | 'json'>>

export async function saveDayPlanRequest(payload: SavePayload, fetchImpl: FetchLike = fetch): Promise<SaveOutcome> {
  let res: Awaited<ReturnType<FetchLike>>
  try {
    res = await fetchImpl('/api/v1/plan/day/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
  } catch {
    return { status: 'error' }
  }
  if (!res || typeof res.status !== 'number') return { status: 'error' }
  if (res.status === 401) return { status: 'signed_out' }
  if (res.status === 429) return { status: 'limit' }
  if (res.status === 409) return { status: 'profile' }
  if (!res.ok) return { status: 'error' }

  let json: unknown
  try { json = await res.json() } catch { return { status: 'error' } }
  if (!json || typeof json !== 'object') return { status: 'error' }
  const body = json as { success?: unknown; data?: unknown }
  if (body.success !== true || !body.data || typeof body.data !== 'object') return { status: 'error' }
  const id = (body.data as { id?: unknown }).id
  return typeof id === 'string' && id !== '' ? { status: 'saved', id } : { status: 'error' }
}
