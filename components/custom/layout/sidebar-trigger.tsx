"use client"

import { useSidebar } from "@/contexts/sidebar-context"

export function SidebarTrigger() {
  const { toggle } = useSidebar()

  return (
    <button
      onClick={toggle}
      aria-label="Open navigation menu"
      className="md:hidden flex items-center rounded-lg p-1 transition-opacity hover:opacity-80"
    >
      <span className="font-header text-2xl font-bold text-[#59FFA0]">
        RTNY
      </span>
    </button>
  )
}
