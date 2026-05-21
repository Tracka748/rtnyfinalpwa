"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

interface RewardStatusBarProps {
  points?: number
  stubs?: number
  stubsTarget?: number
  badgeCount?: number
  giftCount?: number
}

type BoxId = "points" | "stubs" | "badges" | "gifts"

interface BoxDef {
  id: BoxId
  icon: string
  label: string
  statusText: string | null
  hasDot: boolean
  dotActive: boolean
  popoverTitle: string
  popoverDesc: string
  popoverStatus: string
}

export default function RewardStatusBar({
  points = 0,
  stubs = 0,
  stubsTarget = 3,
  badgeCount = 0,
  giftCount = 0,
}: RewardStatusBarProps) {
  const [activeBox, setActiveBox] = useState<BoxId | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveBox(null)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const boxes: BoxDef[] = [
    {
      id: "points",
      icon: "🪙",
      label: "Points",
      statusText: String(points),
      hasDot: false,
      dotActive: false,
      popoverTitle: "Points",
      popoverDesc: "Earn points through purchases and event activity.",
      popoverStatus: `${points} pts earned`,
    },
    {
      id: "stubs",
      icon: "🎟",
      label: "Stubs",
      statusText: `${stubs}/${stubsTarget}`,
      hasDot: false,
      dotActive: false,
      popoverTitle: "Stubs",
      popoverDesc: "Collect stubs to unlock free tickets and VIP access.",
      popoverStatus: `${stubs} of ${stubsTarget} for Event Access`,
    },
    {
      id: "badges",
      icon: "🏅",
      label: "Badges",
      statusText: String(badgeCount),
      hasDot: false,
      dotActive: false,
      popoverTitle: "Badges",
      popoverDesc: "Milestones earned through exploration and attendance.",
      popoverStatus: `${badgeCount} badges unlocked`,
    },
    {
      id: "gifts",
      icon: "🎁",
      label: "Gifts",
      statusText: null,
      hasDot: true,
      dotActive: giftCount > 0,
      popoverTitle: "Gifts",
      popoverDesc: "Surprise perks, vouchers, and partner offers.",
      popoverStatus: giftCount > 0 ? `${giftCount} gift available` : "No new gifts",
    },
  ]

  return (
    <div
      ref={containerRef}
      className="w-full px-4 py-3 flex gap-2"
      style={{ background: "#121113" }}
    >
      {boxes.map((box, index) => {
        const isActive = activeBox === box.id
        const isFirst = index === 0
        const isLast = index === boxes.length - 1

        // Anchor popover to near edge on first/last to avoid viewport clip
        const popoverPositionStyle: React.CSSProperties = isFirst
          ? { left: 0 }
          : isLast
          ? { right: 0, left: "auto" }
          : { left: "50%", transform: "translateX(-50%)" }

        // Arrow sits at bottom-center of popover, nudged to stay over the button
        const arrowStyle: React.CSSProperties = isFirst
          ? { left: 20 }
          : isLast
          ? { right: 20, left: "auto" }
          : { left: "50%", transform: "translateX(-50%) rotate(45deg)" }

        return (
          <div key={box.id} className="relative flex-1">
            {/* Popover */}
            {isActive && (
              <Link href="/rewards">
              <div
                className="absolute bottom-full mb-2 z-50 w-48 cursor-pointer"
                style={{
                  ...popoverPositionStyle,
                  background: "#1E1D1F",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
                }}
              >
                {/* Arrow */}
                <div
                  className="absolute -bottom-[5px]"
                  style={{
                    ...arrowStyle,
                    ...(isFirst || isLast ? { transform: "rotate(45deg)" } : {}),
                    width: 10,
                    height: 10,
                    background: "#1E1D1F",
                    borderRight: "1px solid rgba(255,255,255,0.10)",
                    borderBottom: "1px solid rgba(255,255,255,0.10)",
                  }}
                />

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base leading-none">{box.icon}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#F9FDFF" }}
                  >
                    {box.popoverTitle}
                  </span>
                </div>
                <p
                  className="text-xs leading-snug mb-2"
                  style={{ color: "rgba(249,253,255,0.50)" }}
                >
                  {box.popoverDesc}
                </p>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#59FFA0" }}
                >
                  {box.popoverStatus}
                </p>
              </div>
              </Link>
            )}

            {/* Box button */}
            <button
              type="button"
              onClick={() => setActiveBox(isActive ? null : box.id)}
              className="w-full flex flex-col items-center gap-1 py-3 px-1"
              style={{
                background: isActive ? "rgba(89,255,160,0.06)" : "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                transition: "background 0.15s ease",
                cursor: "pointer",
              }}
            >
              <span className="text-xl leading-none">{box.icon}</span>
              <span
                className="text-[10px] uppercase tracking-wider font-medium"
                style={{ color: "rgba(249,253,255,0.45)" }}
              >
                {box.label}
              </span>
              {box.hasDot ? (
                <span
                  className="w-2 h-2 rounded-full mt-0.5"
                  style={{
                    background: box.dotActive ? "#59FFA0" : "rgba(255,255,255,0.20)",
                  }}
                />
              ) : (
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: "#1AC8ED" }}
                >
                  {box.statusText}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
