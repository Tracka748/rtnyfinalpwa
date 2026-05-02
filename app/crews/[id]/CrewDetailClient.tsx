"use client"

import { useState } from "react"
import Link from "next/link"
import { UnlockTimeline } from "@/components/custom/crews/UnlockTimeline"
import { PerkTracker } from "@/components/custom/crews/PerkTracker"
import { JoinCrewDialog } from "@/components/custom/crews/JoinCrewDialog"

const AVATAR_COLOR_CLASSES = [
  "bg-[#59FFA0]",
  "bg-[#1AC8ED]",
  "bg-[#FF6B6B]",
  "bg-[#FFD93D]",
  "bg-[#C77DFF]",
]

interface Member {
  user_id: string
  joined_at: string
  first_name: string
  last_name: string
  has_purchased: boolean
}

interface CrewDetail {
  id: string
  name: string
  invite_code: string
  is_public: boolean
  created_by: string
  created_at: string
  members: Member[]
  total_spend: number
  locked_in_count: number
  total_members: number
}

interface CrewDetailClientProps {
  crew: CrewDetail | null
  userId: string | null
  isPrivateLocked: boolean
}

type JoinedCrew = {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  member_count: number
  user_role: string | null
  joined_at: string | null
  is_public?: boolean
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1F] border border-accent/30 text-white rounded-xl px-4 py-3 text-sm font-sans shadow-lg pointer-events-none">
      {message}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 12 12" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  )
}

function getMilestoneLabel(n: number): string {
  if (n >= 7) return "Bottle Service 🍾"
  if (n >= 5) return "Skip the Line ⚡"
  if (n >= 3) return "Group Discount 🎟️"
  return "None yet"
}

function formatSpend(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function BackLink() {
  return (
    <Link
      href="/crews"
      className="inline-flex items-center gap-1 text-foreground/40 text-sm font-sans hover:text-white transition-colors mb-6"
    >
      ← Crews
    </Link>
  )
}

export default function CrewDetailClient({
  crew,
  userId,
  isPrivateLocked,
}: CrewDetailClientProps) {
  const [joinOpen, setJoinOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleJoinSuccess(_joined: JoinedCrew) {
    window.location.reload()
  }

  // ─── Private locked state ──────────────────────────────────────────────────
  if (isPrivateLocked) {
    return (
      <div className="min-h-screen bg-[#121113]">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <BackLink />
          <div className="bg-[#1A1A1F] rounded-2xl p-8 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <h2 className="font-slab-serif text-lg text-white">This crew is private</h2>
            <p className="text-foreground/50 text-sm mt-2">You need an invite code to join</p>
            <button
              onClick={() => setJoinOpen(true)}
              className="mt-6 bg-accent text-black w-full rounded-xl py-3 font-sans font-medium hover:bg-accent/90 transition-colors"
            >
              Join with Code
            </button>
          </div>
        </div>

        <JoinCrewDialog
          open={joinOpen}
          onOpenChange={setJoinOpen}
          onSuccess={handleJoinSuccess}
          onToast={showToast}
        />
        {toast && <Toast message={toast} />}
      </div>
    )
  }

  if (!crew) return null

  const isMember = userId ? crew.members.some((m) => m.user_id === userId) : false
  const isCreator = userId ? crew.created_by === userId : false
  const milestoneLabel = getMilestoneLabel(crew.total_members)

  async function handleShare() {
    const text = `Join my crew "${crew!.name}" on RTNY! Use code ${crew!.invite_code}`
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: crew!.name, text, url })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(`${text} — ${url}`).catch(() => {})
    showToast("Link copied!")
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(crew!.invite_code).catch(() => {})
    showToast("Copied!")
  }

  return (
    <div className="min-h-screen bg-[#121113]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <BackLink />

        {/* ── Crew header ───────────────────────────────────────────────── */}
        <div className="bg-[#1A1A1F] rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: name + badges */}
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="font-slab-serif text-3xl text-white leading-tight">
                {crew.name}
              </h1>
              <div className="flex items-center flex-wrap gap-2">
                <span className="bg-white/5 text-foreground/40 text-xs font-label rounded-full px-2 py-1">
                  {crew.total_members} member{crew.total_members !== 1 ? "s" : ""}
                </span>
                {isCreator && (
                  <span className="bg-accent/10 text-accent text-xs font-label rounded-full px-2 py-0.5">
                    Captain
                  </span>
                )}
                {crew.is_public ? (
                  <span className="bg-accent/10 text-accent text-xs font-label rounded-full px-2 py-0.5">
                    🌐 Public
                  </span>
                ) : (
                  <span className="bg-white/5 text-foreground/40 text-xs font-label rounded-full px-2 py-0.5">
                    🔒 Private
                  </span>
                )}
              </div>
            </div>

            {/* Right: action buttons (members only) */}
            {isMember && (
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  className="text-sm font-sans text-foreground/70 hover:text-white transition-colors border border-white/10 rounded-xl px-3 py-1.5"
                >
                  Share Crew
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 font-mono text-xs text-foreground/40 hover:text-foreground/70 transition-colors bg-white/5 rounded-lg px-2.5 py-1.5"
                >
                  <span className="tracking-widest">{crew.invite_code}</span>
                  <CopyIcon />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="bg-[#1A1A1F] rounded-2xl p-4 mb-4 grid grid-cols-3 divide-x divide-white/5">
          <div className="pr-4">
            <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-1">
              Crew Spent
            </p>
            <p className="font-serif text-xl text-accent leading-tight">
              {formatSpend(crew.total_spend)}
            </p>
          </div>
          <div className="px-4">
            <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-1">
              Locked In
            </p>
            <p className="font-slab-serif text-xl text-white leading-tight">
              {crew.locked_in_count} of {crew.total_members}
            </p>
          </div>
          <div className="pl-4">
            <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-1">
              Milestone
            </p>
            <p className={`font-slab-serif text-sm leading-tight ${milestoneLabel === "None yet" ? "text-foreground/30" : "text-accent"}`}>
              {milestoneLabel}
            </p>
          </div>
        </div>

        {/* ── Unlock Milestones ─────────────────────────────────────────── */}
        <div className="mb-4">
          <UnlockTimeline totalMembers={crew.total_members} />
        </div>

        {/* ── Perk Tracker ──────────────────────────────────────────────── */}
        <div className="mb-4">
          <PerkTracker
            lockedInCount={crew.locked_in_count}
            totalMembers={crew.total_members}
          />
        </div>

        {/* ── Members section ───────────────────────────────────────────── */}
        <div className="mb-4">
          <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
            Members
          </p>
          <div className="bg-[#1A1A1F] rounded-2xl p-4">
            {crew.members.length === 0 ? (
              <p className="text-foreground/40 text-sm font-sans text-center py-4">
                No members yet
              </p>
            ) : (
              crew.members.map((member, i) => (
                <div key={member.user_id}>
                  {i > 0 && <div className="border-t border-white/5" />}
                  <div className="flex items-center gap-3 py-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-sans font-semibold text-[#121113] shrink-0 ${AVATAR_COLOR_CLASSES[i % AVATAR_COLOR_CLASSES.length]}`}
                    >
                      {member.first_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-sans truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-foreground/40 text-xs">
                        Joined {formatDate(member.joined_at)}
                      </p>
                    </div>
                    {member.has_purchased ? (
                      <span className="bg-accent/10 text-accent text-xs rounded-full px-2 py-0.5 shrink-0">
                        ✓ Locked In
                      </span>
                    ) : (
                      <span className="bg-orange-400/10 text-orange-400 text-xs rounded-full px-2 py-0.5 shrink-0">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Non-member CTA ────────────────────────────────────────────── */}
        {!isMember && (
          <div className="bg-[#1A1A1F] rounded-2xl p-6 text-center mt-4">
            {crew.is_public ? (
              <>
                <h2 className="font-slab-serif text-xl text-white">Join this crew</h2>
                <p className="text-foreground/50 text-sm mt-2">
                  Use the invite code to join and unlock group perks
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-3">🔒</p>
                <h2 className="font-slab-serif text-lg text-white">This crew is private</h2>
                <p className="text-foreground/50 text-sm mt-2">
                  You need an invite code to join
                </p>
              </>
            )}
            <button
              onClick={() => setJoinOpen(true)}
              className="mt-6 bg-accent text-black w-full rounded-xl py-3 font-sans font-medium hover:bg-accent/90 transition-colors"
            >
              Join with Code
            </button>
          </div>
        )}
      </div>

      <JoinCrewDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={handleJoinSuccess}
        onToast={showToast}
      />
      {toast && <Toast message={toast} />}
    </div>
  )
}
