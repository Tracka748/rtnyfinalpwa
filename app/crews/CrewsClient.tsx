"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/custom/crews/DashboardHeader"
import { CrewCard } from "@/components/custom/crews/CrewCard"
import { CreateCrewDialog } from "@/components/custom/crews/CreateCrewDialog"
import { JoinCrewDialog } from "@/components/custom/crews/JoinCrewDialog"

export interface Crew {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  member_count: number
  user_role: string | null
  joined_at: string | null
  is_public?: boolean
  description?: string | null
  is_private?: boolean | null
  max_members?: number | null
}

interface CrewsClientProps {
  userId: string
}

function CardSkeleton() {
  return <div className="rounded-2xl bg-white/5 animate-pulse h-64 w-full" />
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1F] border border-accent/30 text-white rounded-xl px-4 py-3 text-sm font-sans shadow-lg pointer-events-none">
      {message}
    </div>
  )
}

export default function CrewsClient({ userId }: CrewsClientProps) {
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const fetchCrews = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/crews/mine")
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setCrews(json.data.crews ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCrews()
  }, [fetchCrews])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  function handleCrewAdded(crew: Crew) {
    setCrews((prev) =>
      prev.some((c) => c.id === crew.id) ? prev : [crew, ...prev]
    )
  }

  return (
    <div className="min-h-screen bg-[#121113]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Page heading */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-label text-xs text-foreground/40">My Crews</span>
          </div>
          <h1 className="font-slab-serif text-3xl font-bold text-white">Crews</h1>
        </div>

        {/* Dashboard header */}
        <DashboardHeader
          crews={crews}
          userId={userId}
          loading={loading}
          onCreateCrew={() => setCreateOpen(true)}
          onJoinCrew={() => setJoinOpen(true)}
        />

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : crews.length === 0 ? (
          <div className="bg-[#1A1A1F] rounded-2xl p-8 flex flex-col items-center gap-4">
            <span className="text-4xl">👥</span>
            <div className="text-center">
              <h2 className="font-slab-serif text-xl text-white">No crews yet</h2>
              <p className="text-foreground/50 text-sm mt-1">
                Start one or join with an invite code
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-accent text-black text-sm font-sans font-medium rounded-xl px-4 py-2 hover:bg-accent/90 transition-colors"
              >
                Start a Crew
              </button>
              <button
                onClick={() => setJoinOpen(true)}
                className="border border-accent/40 text-accent text-sm font-sans rounded-xl px-4 py-2 hover:bg-accent/10 transition-colors"
              >
                Join with Code
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {crews.map((crew) => (
              <CrewCard
                key={crew.id}
                crew={crew}
                userId={userId}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateCrewDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCrewAdded}
        onToast={showToast}
      />
      <JoinCrewDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={handleCrewAdded}
        onToast={showToast}
      />

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  )
}
