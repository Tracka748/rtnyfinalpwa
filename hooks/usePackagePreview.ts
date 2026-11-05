'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLatestGate, fetchPreview, type PreviewResult } from '@/lib/package-preview-client'
import type { PublicReservation, PublicSnapshot } from '@/lib/theme-package-public'
import type { SelectionInput } from '@/lib/theme-package-public-validation'

export const PREVIEW_DEBOUNCE_MS = 300

/** What one successful preview gave us: the listed prices and the reservation numbers (null without terms). */
export interface PreviewData {
  snapshot: PublicSnapshot
  reservation: PublicReservation | null
}

export type PreviewState =
  | { status: 'loading'; last: PreviewData | null }
  | ({ status: 'ready' } & PreviewData)
  | { status: 'rejected'; last: PreviewData | null; message: string }
  | { status: 'error'; last: PreviewData | null }
  | { status: 'not_found' }

export const lastData = (s: PreviewState): PreviewData | null =>
  s.status === 'ready' ? { snapshot: s.snapshot, reservation: s.reservation } : s.status === 'not_found' ? null : s.last

export const lastGood = (s: PreviewState): PublicSnapshot | null => lastData(s)?.snapshot ?? null

function toState(result: PreviewResult, last: PreviewData | null): PreviewState {
  switch (result.kind) {
    case 'ok': return { status: 'ready', snapshot: result.snapshot, reservation: result.reservation }
    case 'rejected': return { status: 'rejected', last, message: result.message }
    case 'not_found': return { status: 'not_found' }
    case 'unavailable': return { status: 'error', last }
  }
}

/**
 * Debounced server preview. Keeps the last good numbers while loading; ignores out-of-order responses.
 * `eventDate` (optional) only lets the server work out the balance due date.
 */
export function usePackagePreview(
  packageKey: string,
  selection: SelectionInput,
  guestCount: number | null,
  enabled: boolean,
  eventDate: string | null = null
) {
  const [state, setState] = useState<PreviewState>({ status: 'loading', last: null })
  const [attempt, setAttempt] = useState(0)
  const gate = useRef(createLatestGate())
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const selectionKey = JSON.stringify(selection)
  const active = enabled && guestCount !== null

  useEffect(() => {
    if (!active || guestCount === null) return
    const controller = new AbortController()
    const token = gate.current.begin()
    setState(prev => ({ status: 'loading', last: lastData(prev) }))
    const timer = setTimeout(async () => {
      const body = {
        selection: selectionRef.current,
        guest_count: guestCount,
        ...(eventDate ? { event_date: eventDate } : {}),
      }
      const result = await fetchPreview(fetch, packageKey, body, controller.signal)
      if (controller.signal.aborted || !gate.current.isCurrent(token)) return
      setState(prev => toState(result, lastData(prev)))
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [packageKey, selectionKey, guestCount, eventDate, attempt, active])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  return { state, retry }
}
