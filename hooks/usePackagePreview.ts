'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLatestGate, fetchPreview, type PreviewResult } from '@/lib/package-preview-client'
import type { PublicSnapshot } from '@/lib/theme-package-public'
import type { SelectionInput } from '@/lib/theme-package-public-validation'

export const PREVIEW_DEBOUNCE_MS = 300

export type PreviewState =
  | { status: 'loading'; last: PublicSnapshot | null }
  | { status: 'ready'; snapshot: PublicSnapshot }
  | { status: 'rejected'; last: PublicSnapshot | null; message: string }
  | { status: 'error'; last: PublicSnapshot | null }
  | { status: 'not_found' }

export const lastGood = (s: PreviewState): PublicSnapshot | null =>
  s.status === 'ready' ? s.snapshot : s.status === 'not_found' ? null : s.last

function toState(result: PreviewResult, last: PublicSnapshot | null): PreviewState {
  switch (result.kind) {
    case 'ok': return { status: 'ready', snapshot: result.snapshot }
    case 'rejected': return { status: 'rejected', last, message: result.message }
    case 'not_found': return { status: 'not_found' }
    case 'unavailable': return { status: 'error', last }
  }
}

/** Debounced server preview. Keeps the last good numbers while loading; ignores out-of-order responses. */
export function usePackagePreview(packageKey: string, selection: SelectionInput, guestCount: number, enabled: boolean) {
  const [state, setState] = useState<PreviewState>({ status: 'loading', last: null })
  const [attempt, setAttempt] = useState(0)
  const gate = useRef(createLatestGate())
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const selectionKey = JSON.stringify(selection)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const token = gate.current.begin()
    setState(prev => ({ status: 'loading', last: lastGood(prev) }))
    const timer = setTimeout(async () => {
      const result = await fetchPreview(fetch, packageKey, { selection: selectionRef.current, guest_count: guestCount }, controller.signal)
      if (controller.signal.aborted || !gate.current.isCurrent(token)) return
      setState(prev => toState(result, lastGood(prev)))
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [packageKey, selectionKey, guestCount, attempt, enabled])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  return { state, retry }
}
