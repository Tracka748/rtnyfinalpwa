"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

interface SavedEventsContextValue {
  isSaved: (eventId: string) => boolean
  toggleSave: (eventId: string) => Promise<void>
  loading: boolean
}

const SavedEventsContext = createContext<SavedEventsContextValue | null>(null)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function SavedEventsProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[SavedEvents] user:', session?.user?.id ?? 'NO SESSION')
      if (!session) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/v1/saved-events')
        if (res.ok) {
          const json = await res.json()
          console.log('[SavedEvents] fetched savedIds:', json.data)
          setSavedIds(new Set<string>(json.data ?? []))
        }
      } catch {
        // silently fail — hearts appear unsaved
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const isSaved = useCallback((eventId: string) => savedIds.has(eventId), [savedIds])

  const toggleSave = useCallback(async (eventId: string) => {
    console.log('[toggleSave] called with eventId:', eventId, 'currently saved:', isSaved(eventId))
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const wasSaved = savedIds.has(eventId)

    setSavedIds(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(eventId) : next.add(eventId)
      return next
    })

    if (!UUID_RE.test(eventId)) return

    try {
      const res = await fetch('/api/v1/saved-events', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      console.log('[SavedEvents] API response:', res.status, await res.clone().text())
      if (!res.ok) throw new Error('save failed')
    } catch {
      setSavedIds(prev => {
        const next = new Set(prev)
        wasSaved ? next.add(eventId) : next.delete(eventId)
        return next
      })
    }
  }, [savedIds])

  return (
    <SavedEventsContext.Provider value={{ isSaved, toggleSave, loading }}>
      {children}
    </SavedEventsContext.Provider>
  )
}

export function useSavedEventsContext() {
  const ctx = useContext(SavedEventsContext)
  if (!ctx) throw new Error("useSavedEventsContext must be used within SavedEventsProvider")
  return ctx
}
