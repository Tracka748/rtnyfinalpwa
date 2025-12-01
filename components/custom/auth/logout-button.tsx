"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF] transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}
