'use client'

// Manages saved event state across the session.
// Fetches all saved IDs once on mount; toggleSave() optimistically updates
// local state and calls the API route (which uses the admin client to bypass RLS).

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/v1/saved-events')
        if (res.ok) {
          const json = await res.json()
          setSavedIds(new Set<string>(json.data ?? []))
        }
      } catch {
        // silently fail — hearts just appear unsaved
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const isSaved = useCallback((eventId: string) => savedIds.has(eventId), [savedIds])

  const toggleSave = useCallback(async (eventId: string) => {
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // TODO: redirect to login page so users can save events
      return
    }

    const wasSaved = savedIds.has(eventId)

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(eventId) : next.add(eventId)
      return next
    })

    try {
      const res = await fetch('/api/v1/saved-events', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      // Revert optimistic update on failure
      setSavedIds(prev => {
        const next = new Set(prev)
        wasSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
  }, [savedIds])

  return { isSaved, toggleSave, loading }
}
