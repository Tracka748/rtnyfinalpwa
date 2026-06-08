'use client'

// Thin wrapper — all state and fetching lives in SavedEventsProvider (contexts/saved-events-context.tsx).
// Only persists events with real UUID IDs — mock/placeholder events toggle locally only.

export { useSavedEventsContext as useSavedEvents } from '@/contexts/saved-events-context'
