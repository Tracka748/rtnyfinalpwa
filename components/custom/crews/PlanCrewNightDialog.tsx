"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors the shape returned by GET /api/v1/crews/[id]/recommendations —
// duplicated locally rather than imported so this dialog never touches the
// existing recommendations/carousel code.

interface RecommendationBundle {
  id: string
  name: string
  discount_percent: number | null
}

interface Recommendation {
  event_id: string
  event_name: string
  event_date: string
  event_time: string | null
  venue: string | null
  bundle: RecommendationBundle | null
}

interface SearchResult {
  event_id: string
  event_name: string
  event_date: string
}

interface SelectedEvent {
  event_id: string
  event_name: string
  event_date: string
  bundle: RecommendationBundle | null
  includeBundle: boolean
}

interface PlanCrewNightDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  crewId: string
  onSuccess: () => void
  onToast: (message: string) => void
}

type Step = "details" | "events"
type SearchType = "events" | "venues"

function formatEventDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, h:mm a")
  } catch {
    return dateStr
  }
}

export function PlanCrewNightDialog({
  open,
  onOpenChange,
  crewId,
  onSuccess,
  onToast,
}: PlanCrewNightDialogProps) {
  const [step, setStep] = useState<Step>("details")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [recsLoading, setRecsLoading] = useState(false)

  const [searchType, setSearchType] = useState<SearchType>("events")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [selected, setSelected] = useState<SelectedEvent[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setStep("details")
    setName("")
    setDescription("")
    setRecommendations(null)
    setRecsLoading(false)
    setSearchType("events")
    setSearchQuery("")
    setSearchResults([])
    setSearchLoading(false)
    setSelected([])
    setSubmitting(false)
    setError("")
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  // ── Fetch recommendations once, when the events step is entered ──────────
  useEffect(() => {
    if (step !== "events" || recommendations !== null) return
    let cancelled = false
    async function fetchRecs() {
      setRecsLoading(true)
      try {
        const res = await fetch(`/api/v1/crews/${crewId}/recommendations`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setRecommendations(json.recommendations ?? [])
        } else if (!cancelled) {
          setRecommendations([])
        }
      } catch {
        if (!cancelled) setRecommendations([])
      } finally {
        if (!cancelled) setRecsLoading(false)
      }
    }
    fetchRecs()
    return () => {
      cancelled = true
    }
  }, [step, recommendations, crewId])

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: searchQuery.trim(), type: searchType })
        const res = await fetch(`/api/v1/crews/${crewId}/plan-nights/search?${params}`)
        const json = await res.json()
        setSearchResults(json.success ? json.results ?? [] : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchQuery, searchType, crewId])

  function isSelected(eventId: string) {
    return selected.some((s) => s.event_id === eventId)
  }

  function addEvent(item: { event_id: string; event_name: string; event_date: string; bundle?: RecommendationBundle | null }) {
    if (isSelected(item.event_id)) return
    setSelected((prev) => [
      ...prev,
      {
        event_id: item.event_id,
        event_name: item.event_name,
        event_date: item.event_date,
        bundle: item.bundle ?? null,
        includeBundle: false,
      },
    ])
  }

  function removeEvent(eventId: string) {
    setSelected((prev) => prev.filter((s) => s.event_id !== eventId))
  }

  function toggleBundle(eventId: string) {
    setSelected((prev) =>
      prev.map((s) => (s.event_id === eventId ? { ...s, includeBundle: !s.includeBundle } : s))
    )
  }

  function handleNext() {
    if (!name.trim()) return
    setStep("events")
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/v1/crews/${crewId}/plan-nights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          events: selected.map((s) => ({
            event_id: s.event_id,
            bundle_id: s.includeBundle && s.bundle ? s.bundle.id : null,
          })),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Failed to create plan")
        return
      }
      onSuccess()
      onToast("Crew night planned!")
      handleClose(false)
    } catch {
      setError("Failed to create plan")
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase =
    "w-full bg-[#121113] border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-sm placeholder:text-foreground/30 outline-none focus:border-accent/50 transition-colors"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan Our Crew Night</DialogTitle>
          <DialogDescription>
            {step === "details"
              ? "Give this plan a name your crew will recognize."
              : "Add events your crew is going to — from recommendations or search."}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Friday Night Out, Bash's Birthday, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNext()
              }}
              autoFocus
            />
            <textarea
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputBase + " resize-none"}
            />
            <Button
              onClick={handleNext}
              disabled={!name.trim()}
              className="w-full bg-accent text-black hover:bg-accent/90"
            >
              Next: Add Events
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Recommended */}
            <div>
              <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-2">
                Recommended for your crew
              </p>
              {recsLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : recommendations && recommendations.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.event_id}
                      className="flex items-center justify-between gap-2 bg-[#121113] border border-white/10 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-sans truncate">{rec.event_name}</p>
                        <p className="text-foreground/40 text-xs font-sans">
                          {formatEventDate(rec.event_date)}
                          {rec.bundle ? ` · ${rec.bundle.name}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addEvent({
                            event_id: rec.event_id,
                            event_name: rec.event_name,
                            event_date: rec.event_date,
                            bundle: rec.bundle,
                          })
                        }
                        disabled={isSelected(rec.event_id)}
                        className={`shrink-0 text-xs font-sans font-medium rounded-lg px-2.5 py-1.5 transition-colors ${
                          isSelected(rec.event_id)
                            ? "bg-white/5 text-foreground/30 cursor-default"
                            : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        {isSelected(rec.event_id) ? "Added" : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-foreground/40 text-xs font-sans">Nothing recommended right now.</p>
              )}
            </div>

            {/* Search */}
            <div>
              <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-2">
                Or search
              </p>
              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                <TabsList className="mb-2">
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="venues">Venues</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input
                placeholder={searchType === "events" ? "Search events by name…" : "Search venues by name…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchLoading && (
                <p className="text-foreground/40 text-xs font-sans mt-2">Searching…</p>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {searchResults.map((res) => (
                    <div
                      key={res.event_id}
                      className="flex items-center justify-between gap-2 bg-[#121113] border border-white/10 rounded-xl px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-sans truncate">{res.event_name}</p>
                        <p className="text-foreground/40 text-xs font-sans">{formatEventDate(res.event_date)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addEvent(res)}
                        disabled={isSelected(res.event_id)}
                        className={`shrink-0 text-xs font-sans font-medium rounded-lg px-2.5 py-1.5 transition-colors ${
                          isSelected(res.event_id)
                            ? "bg-white/5 text-foreground/30 cursor-default"
                            : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        {isSelected(res.event_id) ? "Added" : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-foreground/40 text-xs font-sans mt-2">No matches.</p>
              )}
            </div>

            {/* Selected */}
            <div>
              <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-2">
                Selected ({selected.length})
              </p>
              {selected.length === 0 ? (
                <p className="text-foreground/40 text-xs font-sans">No events added yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selected.map((s) => (
                    <div key={s.event_id} className="bg-accent/5 border border-accent/20 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-sans truncate">{s.event_name}</p>
                          <p className="text-foreground/40 text-xs font-sans">{formatEventDate(s.event_date)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEvent(s.event_id)}
                          className="shrink-0 text-foreground/40 hover:text-red-400 text-xs font-sans transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      {s.bundle && (
                        <label className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.includeBundle}
                            onChange={() => toggleBundle(s.event_id)}
                            className="accent-[#59FFA0]"
                          />
                          <span className="text-xs font-sans text-foreground/70">
                            Include bundle: {s.bundle.name}
                          </span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button
                onClick={() => setStep("details")}
                variant="outline"
                className="shrink-0"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-accent text-black hover:bg-accent/90"
              >
                {submitting ? "Saving…" : "Save Plan"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
