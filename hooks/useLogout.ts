"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

export function useLogout(onDone?: () => void) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" })

      if (!response.ok) {
        console.error("Logout failed:", response.status, await response.text())
        return
      }

      // Fire SIGNED_OUT on the in-browser client so nav/sidebar listeners update.
      await createBrowserSupabaseClient().auth.signOut({ scope: "local" })

      onDone?.()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoading(false)
    }
  }, [onDone, router])

  return { logout, loading }
}
