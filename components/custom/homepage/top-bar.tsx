"use client"

import { Bell, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TopBarProps {
  points: number
  badge: string
  isLoggedIn: boolean
}

export function TopBar({ points, badge, isLoggedIn }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-accent-primary">RTNY</div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* Points */}
              <button className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-elevated">
                <Coins className="h-4 w-4 text-accent-primary" />
                <span className="text-text-primary">{points.toLocaleString()}</span>
              </button>

              {/* Badge */}
              <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm">
                <span className="text-xl">{badge === "Explorer" ? "🏅" : badge === "Night Owl" ? "🦉" : "💎"}</span>
                <span className="hidden text-[#7DD8E8] sm:inline">{badge}</span>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-tertiary" />
              </Button>

              {/* Avatar */}
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-accent-primary text-background">U</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <Button size="sm" className="bg-accent-primary text-background hover:bg-accent-primary/90">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
