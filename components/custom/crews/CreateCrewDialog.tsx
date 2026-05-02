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
}

interface CreateCrewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (crew: Crew) => void
  onToast: (message: string) => void
}

export function CreateCrewDialog({
  open,
  onOpenChange,
  onSuccess,
  onToast,
}: CreateCrewDialogProps) {
  const [name, setName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleClose(v: boolean) {
    if (!v) {
      setName("")
      setIsPublic(false)
      setError("")
    }
    onOpenChange(v)
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/v1/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), is_public: isPublic }),
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
            disabled={submitting || !name.trim()}
            className="w-full bg-accent text-black hover:bg-accent/90"
          >
            {submitting ? "Creating…" : "Create Crew"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
