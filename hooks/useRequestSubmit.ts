'use client'

import { useCallback, useRef, useState } from 'react'
import { classifyRequestResponse, type RequestOutcome } from '@/lib/package-request-form'

/**
 * Posts a package request once at a time. The ref guards the handler itself (a double click or a double
 * Enter before React re-renders still sends a single request). Returns null when a send is already in flight.
 */
export function useRequestSubmit(packageKey: string) {
  const inFlight = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  const send = useCallback(
    async (body: unknown): Promise<RequestOutcome | null> => {
      if (inFlight.current) return null
      inFlight.current = true
      setSubmitting(true)
      try {
        let status = 0
        let json: unknown = null
        try {
          const res = await fetch(`/api/v1/theme-packages/${encodeURIComponent(packageKey)}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          status = res.status
          try { json = await res.json() } catch { json = null }
        } catch {
          status = 0
        }
        return classifyRequestResponse(status, json)
      } finally {
        inFlight.current = false
        setSubmitting(false)
      }
    },
    [packageKey]
  )

  return { submitting, send }
}
