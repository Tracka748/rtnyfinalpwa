// components/custom/layout/app-nav.tsx
"use client"

import { ArrowLeft, Share2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AppNavProps {
  /** Show back button (for detail pages) */
  showBack?: boolean
  /** Custom back action */
  onBack?: () => void
  /** Page title (shows on mobile when scrolled) */
  title?: string
  /** Show share button */
  showShare?: boolean
  /** Custom share action */
  onShare?: () => void
}

export function AppNav({ 
  showBack = false, 
  onBack, 
  title,
  showShare = false,
  onShare 
}: AppNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121113]/80 backdrop-blur-xl border-b border-[#F9FDFF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-10 w-10 rounded-full hover:bg-[#F9FDFF]/10 active:scale-95 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-[#F9FDFF]" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-[#F9FDFF]/10 active:scale-95 transition-all duration-200"
            >
              <Menu className="h-5 w-5 text-[#F9FDFF]" />
            </Button>
          )}
        </div>

        {/* Center - Logo/Title */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          {title ? (
            <h1 className="text-base font-semibold text-[#F9FDFF] font-[family-name:var(--font-poppins)] truncate max-w-[200px] sm:max-w-[300px]">
              {title}
            </h1>
          ) : (
            <Link href="/events" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] bg-clip-text text-transparent font-[family-name:var(--font-rokkitt)]">
                RTNY
              </span>
            </Link>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {showShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShare}
              className="h-10 w-10 rounded-full hover:bg-[#F9FDFF]/10 active:scale-95 transition-all duration-200"
            >
              <Share2 className="h-5 w-5 text-[#F9FDFF]" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}