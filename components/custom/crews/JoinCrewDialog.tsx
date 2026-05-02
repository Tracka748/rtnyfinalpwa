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

interface JoinCrewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (crew: Crew) => void
  onToast: (message: string) => void
}

export function JoinCrewDialog({
  open,
  onOpenChange,
  onSuccess,
  onToast,
}: JoinCrewDialogProps) {
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleClose(v: boolean) {
    if (!v) {
      setCode("")
      setError("")
    }
    onOpenChange(v)
  }

  async function handleSubmit() {
    if (!code.trim()) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/v1/crews/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Failed to join crew")
        return
      }
      const crew: Crew = {
        ...json.data.crew,
        member_count: 1,
        user_role: "member",
        joined_at: new Date().toISOString(),
      }
      onSuccess(crew)
      onToast("You're in!")
      handleClose(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join with Code</DialogTitle>
          <DialogDescription>
            Enter the 6-character invite code shared by your crew leader.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Enter 6-character code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
            disabled={submitting}
            autoFocus
            className="uppercase tracking-widest text-center"
            maxLength={12}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !code.trim()}
            className="w-full bg-accent text-black hover:bg-accent/90"
          >
            {submitting ? "Joining…" : "Join Crew"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
