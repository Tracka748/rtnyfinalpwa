"use client"

import { useLogout } from "@/hooks/useLogout"

const DEFAULT_CLASS_NAME =
  "rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF] transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/10 disabled:opacity-50 disabled:cursor-not-allowed"

interface LogoutButtonProps {
  className?: string
  onDone?: () => void
}

export function LogoutButton({ className, onDone }: LogoutButtonProps) {
  const { logout, loading } = useLogout(onDone)

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className={className ?? DEFAULT_CLASS_NAME}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  )
}
