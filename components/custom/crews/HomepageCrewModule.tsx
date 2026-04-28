"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Crew {
  id: string
  name: string
  member_count: number
  invite_code: string
}

type DialogMode = "create" | "join" | null

export function HomepageCrewModule() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [inputValue, setInputValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function init() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        setIsLoggedIn(true)
        await fetchCrews()
      } catch {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchCrews() {
    try {
      const res = await fetch("/api/v1/crews/mine")
      if (!res.ok) return
      const json = await res.json()
      if (json.success) setCrews(json.data.crews ?? [])
    } finally {
      setLoading(false)
    }
  }

  function handleCTAClick(mode: "create" | "join") {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/crews`)
      return
    }
    setError("")
    setInputValue("")
    setDialogMode(mode)
  }

  async function handleSubmit() {
    if (!inputValue.trim()) return
    setSubmitting(true)
    setError("")
    try {
      if (dialogMode === "create") {
        const res = await fetch("/api/v1/crews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: inputValue.trim() }),
        })
        const json = await res.json()
        if (!json.success) {
          setError(json.error ?? "Failed to create crew")
          return
        }
      } else {
        const res = await fetch("/api/v1/crews/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite_code: inputValue.trim() }),
        })
        const json = await res.json()
        if (!json.success) {
          setError(json.error ?? "Failed to join crew")
          return
        }
      }
      setDialogMode(null)
      setLoading(true)
      await fetchCrews()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="rounded-2xl bg-white/5 animate-pulse block h-32 w-full" />
  }

  return (
    <>
      {isLoggedIn && crews.length > 0 ? (
        <div className="bg-[#1A1A1F] rounded-2xl p-4">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {crews.map((crew) => (
              <div
                key={crew.id}
                className="shrink-0 w-40 bg-[#1E1E24] rounded-xl p-4 border border-white/5 flex flex-col gap-2"
              >
                <p className="font-slab-serif text-sm font-semibold text-white truncate">{crew.name}</p>
                <div className="flex items-center gap-1.5">
                  <AvatarStack count={Math.min(crew.member_count, 4)} />
                  <span className="text-xs text-foreground/50">{crew.member_count} member{crew.member_count !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
            <button
              onClick={() => handleCTAClick("create")}
              className="shrink-0 h-auto bg-[#1E1E24] rounded-xl px-4 py-3 border border-white/5 flex items-center gap-1.5 text-accent text-sm font-medium whitespace-nowrap hover:border-accent/30 transition-colors"
            >
              <span className="text-base leading-none">+</span> New Crew
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1F] rounded-2xl p-4">
          <div className="bg-[#1E1E24] rounded-xl p-5 border border-white/5 flex flex-col gap-4">
            <div className="text-3xl">👥</div>
            <div className="flex flex-col gap-1">
              <h3 className="font-slab-serif text-white text-lg font-semibold leading-snug">
                Better with your crew
              </h3>
              <p className="font-sans text-foreground/60 text-sm">
                Plan Rochester nights out together. Invite your people.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCTAClick("create")}
                className="flex-1 bg-accent text-black font-medium hover:bg-accent/90 h-9 text-sm"
              >
                Start a Crew
              </Button>
              <Button
                onClick={() => handleCTAClick("join")}
                variant="outline"
                className="flex-1 border border-accent/40 text-accent bg-transparent hover:bg-accent/10 hover:text-accent h-9 text-sm"
              >
                Join with Code
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) setDialogMode(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Start a Crew" : "Join with Code"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Give your crew a name. You can invite people after."
                : "Enter the invite code shared by your crew leader."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder={dialogMode === "create" ? "Crew name" : "Invite code"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
              disabled={submitting}
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !inputValue.trim()}
              className="w-full bg-accent text-black hover:bg-accent/90"
            >
              {submitting ? "…" : dialogMode === "create" ? "Create Crew" : "Join Crew"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AvatarStack({ count }: { count: number }) {
  return (
    <div className="flex -space-x-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full bg-accent/30 border border-[#1E1E24] flex items-center justify-center"
          style={{ zIndex: count - i }}
        />
      ))}
    </div>
  )
}
