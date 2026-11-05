// Browser-side helpers for the server price preview. fetch is injected so this is testable in node.

import { projectReservation, type LiveDocument, type PublicReservation, type PublicSnapshot } from '@/lib/theme-package-public'
import type { SelectionInput } from '@/lib/theme-package-public-validation'

export type PreviewResult =
  | { kind: 'ok'; snapshot: PublicSnapshot; reservation: PublicReservation | null }
  | { kind: 'rejected'; message: string }
  | { kind: 'not_found' }
  | { kind: 'unavailable' }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function isSnapshot(v: unknown): v is PublicSnapshot {
  return (
    isObject(v) &&
    Array.isArray(v.items) &&
    Array.isArray(v.excluded) &&
    (v.listed_subtotal === null || typeof v.listed_subtotal === 'number') &&
    (v.unpriced_items === null || typeof v.unpriced_items === 'number')
  )
}

const readJson = async (res: Response): Promise<unknown> => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchPreview(
  fetchFn: typeof fetch,
  packageKey: string,
  body: { selection: SelectionInput; guest_count: number; event_date?: string },
  signal?: AbortSignal
): Promise<PreviewResult> {
  let res: Response
  try {
    res = await fetchFn(`/api/v1/theme-packages/${encodeURIComponent(packageKey)}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch {
    return { kind: 'unavailable' } // network error or abort; the caller checks the signal
  }
  const json = await readJson(res)
  if (res.status === 404) return { kind: 'not_found' }
  if (res.status === 400) {
    const message = isObject(json) && typeof json.error === 'string' ? json.error.slice(0, 200) : ''
    return { kind: 'rejected', message }
  }
  const data = isObject(json) ? json.data : undefined
  if (res.ok && isObject(json) && json.success === true && isObject(data) && isSnapshot(data)) {
    return { kind: 'ok', snapshot: data, reservation: projectReservation({ reservation: data.reservation }) }
  }
  return { kind: 'unavailable' }
}

/** Ignores out-of-order responses: only the most recently started request is current. */
export function createLatestGate() {
  let latest = 0
  return {
    begin: () => ++latest,
    isCurrent: (token: number) => token === latest,
  }
}

/** The GET document response, checked just enough to trust the shape. */
export function parseLiveDocumentResponse(json: unknown): LiveDocument | null {
  if (!isObject(json) || json.success !== true || !isObject(json.data)) return null
  const d = json.data
  if (typeof d.key !== 'string' || typeof d.version_id !== 'string' || typeof d.occasion !== 'string') return null
  if (!isObject(d.meta) || typeof d.meta.title !== 'string' || typeof d.requestable !== 'boolean') return null
  if (!Array.isArray(d.components)) return null
  const ok = d.components.every(
    c => isObject(c) && typeof c.id === 'string' && typeof c.slot_label === 'string' && typeof c.requirement === 'string' && Array.isArray(c.options)
  )
  return ok ? (d as unknown as LiveDocument) : null
}
