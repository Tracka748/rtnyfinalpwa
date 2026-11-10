'use client'

import { useEffect, useState } from 'react'

export interface KeyboardInset { bottom: number; maxHeight: number }

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

/**
 * While `active`, reports how far the on-screen keyboard covers the bottom of the page on small screens,
 * so a bottom sheet can lift above it and keep its textarea visible. Returns null when there is no
 * keyboard, on desktop, or when the browser already resizes the layout (the CSS dvh limit handles that).
 */
export function useKeyboardInset(active: boolean): KeyboardInset | null {
  const [inset, setInset] = useState<KeyboardInset | null>(null)

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!active || !vv) { setInset(null); return }

    const update = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches
      const covered = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      setInset(mobile && covered > 80 ? { bottom: covered, maxHeight: Math.max(240, Math.round(vv.height - 16)) } : null)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setInset(null)
    }
  }, [active])

  return inset
}
