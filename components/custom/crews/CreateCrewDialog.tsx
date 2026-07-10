"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface Crew {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  member_count: number
  user_role: string | null
  joined_at: string | null
  is_public?: boolean
  crew_status?: string | null
}

interface CreateCrewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (crew: Crew) => void
  onToast: (message: string) => void
}

const CREW_STATUS_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { value: "couples", label: "Couples", emoji: "❤️" },
  { value: "friends", label: "Friends", emoji: "🍻" },
  { value: "coworkers", label: "Coworkers", emoji: "💼" },
  { value: "college_friends", label: "College friends", emoji: "🎓" },
  { value: "sports_team", label: "Sports team", emoji: "🏀" },
  { value: "gaming_group", label: "Gaming group", emoji: "🎮" },
  { value: "birthday_group", label: "Birthday group", emoji: "🎉" },
  { value: "community_volunteer", label: "Community or volunteer group", emoji: "🙏" },
  { value: "club_organization", label: "Club or organization", emoji: "🎭" },
]

export function CreateCrewDialog({
  open,
  onOpenChange,
  onSuccess,
  onToast,
}: CreateCrewDialogProps) {
  const [name, setName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [crewStatus, setCrewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleClose(v: boolean) {
    if (!v) {
      setName("")
      setIsPublic(false)
      setCrewStatus("")
      setError("")
    }
    onOpenChange(v)
  }

  async function handleSubmit() {
    if (!name.trim() || !crewStatus) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/v1/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          is_public: isPublic,
          crew_status: crewStatus,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Failed to create crew")
        return
      }
      const crew: Crew = {
        ...json.data.crew,
        member_count: 1,
        user_role: "owner",
        joined_at: new Date().toISOString(),
        is_public: isPublic,
      }
      onSuccess(crew)
      onToast("Crew created!")
      handleClose(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Crew</DialogTitle>
          <DialogDescription>
            Give your crew a name and invite your people.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Input
            placeholder="The Fellas, Squad, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
            disabled={submitting}
            autoFocus
          />

          <div>
            <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-2">
              What kind of crew is this?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CREW_STATUS_OPTIONS.map((opt) => {
                const active = crewStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCrewStatus(opt.value)}
                    disabled={submitting}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-sans text-left transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/10 bg-white/5 text-foreground/70 hover:border-accent/30"
                    }`}
                  >
                    <span className="shrink-0">{opt.emoji}</span>
                    <span className="leading-tight">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-foreground/40 font-sans mt-2">
              Choose carefully — this can't be changed later.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/60 font-sans">
              Make this crew public?
            </span>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !crewStatus}
            className="w-full bg-accent text-black hover:bg-accent/90"
          >
            {submitting ? "Creating…" : "Create Crew"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
