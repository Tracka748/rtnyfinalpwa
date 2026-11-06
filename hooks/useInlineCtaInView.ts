'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks whether the inline call-to-action is in the viewport.
 * `inView` is null until the observer has reported once (unknown: callers keep the sticky bar hidden so it
 * never flashes on first paint), then true or false. With no IntersectionObserver it is false, so the bar shows.
 * Attach `ref` to the inline button. When the element goes away (view switch) the state goes back to null.
 *
 * The observer reports intersection with the viewport, not occlusion by the fixed bar. A button peeking
 * out above the bar still counts as "in view" and the bar hides. That is the intended behavior.
 */
export function useInlineCtaInView() {
  const [inView, setInView] = useState<boolean | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)

  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el) {
      setInView(null)
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      setInView(false)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        const last = entries[entries.length - 1]
        if (last) setInView(last.isIntersecting)
      },
      { threshold: 0 }
    )
    io.observe(el)
    observer.current = io
  }, [])

  useEffect(() => () => observer.current?.disconnect(), [])

  return { ref, inView }
}
