'use client'

import { useEffect, useState } from 'react'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

export const INBOX_UNREAD_EVENT = 'rtny:inbox-unread-changed'

/** Tell every mounted useInboxUnread to refetch (e.g. after a request was marked read). */
export function notifyInboxUnreadChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(INBOX_UNREAD_EVENT))
}

/**
 * The caller's unread request count, or null when unknown (loading or failed).
 * Fetched on mount, on window focus and after notifyInboxUnreadChanged. No polling.
 */
export function useInboxUnread(): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    let seq = 0

    async function load() {
      const mine = ++seq
      let next: number | null = null
      try {
        const res = await fetch('/api/v1/admin/requests/unread-count', { cache: 'no-store' })
        if (res.ok) {
          const body = await res.json()
          const n = body?.data?.count
          if (typeof n === 'number' && Number.isFinite(n)) next = n
        }
      } catch {
        // a failed count simply shows no badge
      }
      if (alive && mine === seq) setCount(next)
    }

    void load()
    window.addEventListener('focus', load)
    window.addEventListener(INBOX_UNREAD_EVENT, load)
    return () => {
      alive = false
      window.removeEventListener('focus', load)
      window.removeEventListener(INBOX_UNREAD_EVENT, load)
    }
  }, [])

  return count
}
