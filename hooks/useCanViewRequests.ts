'use client'

import { useEffect, useState } from 'react'
import { lookupCanView } from '@/lib/staff-nav'

// One staff-access call per signed-in user, shared by the sidebar, the mobile menu and the desktop
// top bar. The answer is cleared on sign-out and replaced when the user changes.
let cache: { userId: string; promise: Promise<boolean> } | null = null

function lookup(userId: string): Promise<boolean> {
  if (cache?.userId === userId) return cache.promise
  const promise = lookupCanView()
  cache = { userId, promise }
  return promise
}

/** True only when the server says this user may open the request inbox. False while unknown. */
export function useCanViewRequests(userId: string | null): boolean {
  const [can, setCan] = useState(false)

  useEffect(() => {
    let alive = true
    if (!userId) {
      cache = null
      setCan(false)
      return
    }
    setCan(false)
    void lookup(userId).then(v => {
      if (alive) setCan(v)
    })
    return () => {
      alive = false
    }
  }, [userId])

  return can
}
