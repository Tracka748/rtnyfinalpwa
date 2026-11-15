'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { safeSessionStorage, setReturnTo } from '@/lib/return-to'

/**
 * Shown by the staff layout when nobody is signed in. A server layout can neither read the current URL
 * nor write sessionStorage, so this stores the current path with the existing return-to mechanism
 * (setReturnTo only accepts same-origin relative paths) and sends the user to the login page. After
 * sign-in, VerifyForm reads the path back and returns the user to the same URL.
 */
export function SignInRedirect() {
  const router = useRouter()

  useEffect(() => {
    setReturnTo(safeSessionStorage(), window.location.pathname + window.location.search)
    router.replace('/login')
  }, [router])

  return <p role="status" className="p-6 text-base leading-6 text-[#7DD8E8]">Redirecting to sign in…</p>
}
