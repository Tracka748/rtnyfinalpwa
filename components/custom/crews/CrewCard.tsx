"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { MemberAvatarStack } from "@/components/custom/crews/MemberAvatarStack"
import { GroupTabWidget } from "@/components/custom/crews/GroupTabWidget"
import { PerkTracker } from "@/components/custom/crews/PerkTracker"
import { UnlockTimeline } from "@/components/custom/crews/UnlockTimeline"

interface Crew {
  id: string
  name: string
  invite_code: string
  created_by: string
  member_count: number
  user_role: string | null
  is_public?: boolean
  total_events?: number
}

interface Stats {
  total_spend: number
  locked_in_count: number
  total_members: number
  review_count: number
}

interface CrewCardProps {
  crew: Crew
  userId: string
  index: number
  onToast: (message: string) => void
}

const GLOW_COLORS = { mint: "#59FFA0", cyan: "#1AC8ED" } as const

export function CrewCard({ crew, userId, index, onToast }: CrewCardProps) {
  const glowColor = index % 2 === 0 ? GLOW_COLORS.mint : GLOW_COLORS.cyan
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [isPublic, setIsPublic] = useState(crew.is_public ?? false)
  const [toggling, setToggling] = useState(false)

  const isCreator = crew.created_by === userId

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/v1/crews/${crew.id}/stats`)
        if (!res.ok) return
        const json = await res.json()
        if (!json.success) return

        const supabase = createBrowserSupabaseClient()
        const { count: reviewCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('crew_id', crew.id)

        setStats({ ...json.data, review_count: reviewCount ?? 0 })
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [crew.id])

  async function handleTogglePublic() {
    if (!isCreator || toggling) return
    const newVal = !isPublic
    setIsPublic(newVal)
    setToggling(true)
    try {
      const res = await fetch(`/api/v1/crews/${crew.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: newVal }),
      })
      const json = await res.json()
      if (!json.success) {
        setIsPublic(!newVal)
        onToast("Failed to update visibility")
      }
    } catch {
      setIsPublic(!newVal)
    } finally {
      setToggling(false)
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(crew.invite_code).catch(() => {})
    onToast("Copied!")
  }

  async function handleShare() {
    const text = `Join my crew on RTNY! Use code ${crew.invite_code} at rocticketny.com/crews`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        await navigator.clipboard.writeText(text).catch(() => {})
        onToast("Copied to clipboard!")
      }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {})
      onToast("Copied to clipboard!")
    }
  }

  async function handleInviteFriends() {
    const text = `Join my crew on RTNY! Use code ${crew.invite_code} at rocticketny.com/crews`

    // Try native share sheet first (best on mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }

    // Clipboard API (works on HTTPS / desktop)
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        onToast("Invite link copied!")
        return
      } catch {
        // Fall through to textarea fallback
      }
    }

    // Universal fallback — works on HTTP, iOS webview, old browsers
    try {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      onToast("Invite link copied!")
    } catch {
      onToast("Couldn't copy — share code: " + crew.invite_code)
    }
  }

  const effectiveMembers = stats?.total_members ?? crew.member_count
  const lockedIn = stats?.locked_in_count ?? 0

  return (
    <div
      className="bg-[#1A1A1F] rounded-2xl p-5 border border-white/5 space-y-4"
      style={{
        borderTopWidth: "3px",
        borderTopColor: glowColor,
        boxShadow: `0 -10px 24px ${glowColor}33, 0 -24px 50px ${glowColor}14`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="font-slab-serif text-lg text-white leading-tight">
            {crew.name}
          </h3>
          {isCreator && (
            <span className="bg-accent/10 text-accent text-xs font-label rounded-full px-2 py-0.5 shrink-0">
              Captain
            </span>
          )}
        </div>

        {/* Public/Private toggle */}
        <button
          type="button"
          onClick={isCreator ? handleTogglePublic : undefined}
          disabled={toggling || !isCreator}
          className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
            isPublic
              ? "bg-accent/10 text-accent"
              : "bg-white/5 text-foreground/40"
          } ${isCreator ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        >
          {isPublic ? "🌐 Public" : "🔒 Private"}
        </button>
      </div>

      {/* Avatar stack + View Crew */}
      <div className="flex items-center justify-between gap-2">
        <MemberAvatarStack
          count={crew.member_count}
          lockedInCount={lockedIn}
        />
        <Link
          href={`/crews/${crew.id}`}
          className="text-accent text-sm font-sans hover:text-accent/80 transition-colors shrink-0"
        >
          View Crew →
        </Link>
      </div>

      {/* Invite More Friends */}
      {effectiveMembers < 7 && (
        <button
          type="button"
          onClick={handleInviteFriends}
          className="w-full rounded-xl py-2 border border-dashed border-accent/40 text-accent text-sm font-sans bg-transparent hover:bg-accent/5 transition-colors"
        >
          + Invite More Friends
        </button>
      )}

      {/* Widgets */}
      <GroupTabWidget
        totalSpend={stats?.total_spend ?? 0}
        loading={statsLoading}
      />
      <PerkTracker
        memberCount={effectiveMembers}
        totalEvents={crew.total_events ?? 0}
        reviewCount={stats?.review_count ?? 0}
      />
      <UnlockTimeline
        memberCount={effectiveMembers}
        totalEvents={crew.total_events ?? 0}
        reviewCount={stats?.review_count ?? 0}
      />

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 text-foreground/40 text-xs font-mono hover:text-foreground/70 transition-colors"
        >
          <span className="tracking-widest">{crew.invite_code}</span>
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
            <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="text-foreground/50 text-xs font-sans hover:text-foreground/80 transition-colors"
        >
          Share
        </button>
      </div>
    </div>
  )
}
