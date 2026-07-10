"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

interface Bundle {
  id: string
  name: string
  discount_percent: number | null
  tags: unknown
  min_tickets: number
}

interface Rsvp {
  going_count: number
  maybe_count: number
}

interface PrimaryBusiness {
  name: string
  logo_url: string | null
}

interface Recommendation {
  event_id: string
  event_name: string
  event_date: string
  event_time: string | null
  venue: string | null
  bundle: Bundle | null
  rsvp: Rsvp | null
  primary_business: PrimaryBusiness | null
}

interface CrewRecommendationsCarouselProps {
  crewId: string
}

type RsvpUiState = {
  pickerOpen: boolean
  submitting: "going" | "maybe" | null
  error: string | null
}

function bundleTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((t): t is string => typeof t === "string")
}

function formatEventDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "EEE, MMM d")
  } catch {
    return dateStr
  }
}

export function CrewRecommendationsCarousel({ crewId }: CrewRecommendationsCarouselProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [rsvpState, setRsvpState] = useState<Record<string, RsvpUiState>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/v1/crews/${crewId}/recommendations`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setRecommendations(json.recommendations ?? [])
        }
      } catch {
        // Fail quietly — section just won't render
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRecommendations()
    return () => {
      cancelled = true
    }
  }, [crewId])

  function openPicker(eventId: string) {
    setRsvpState((prev) => ({
      ...prev,
      [eventId]: { pickerOpen: true, submitting: null, error: null },
    }))
  }

  function handleViewBundle(bundleId: string) {
    console.log(bundleId)
  }

  async function handleRsvp(eventId: string, status: "going" | "maybe") {
    setRsvpState((prev) => ({
      ...prev,
      [eventId]: { pickerOpen: true, submitting: status, error: null },
    }))

    try {
      const res = await fetch(`/api/v1/crews/${crewId}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, status }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to RSVP")
      }

      setRecommendations((prev) =>
        prev.map((r) => (r.event_id === eventId ? { ...r, rsvp: json.counts } : r))
      )
      setRsvpState((prev) => ({
        ...prev,
        [eventId]: { pickerOpen: false, submitting: null, error: null },
      }))
    } catch (err: any) {
      setRsvpState((prev) => ({
        ...prev,
        [eventId]: { pickerOpen: true, submitting: null, error: err.message || "Failed to RSVP" },
      }))
    }
  }

  if (loading) {
    return (
      <div className="mb-4">
        <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
          Recommended For This Crew
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {[0, 1].map((i) => (
            <div key={i} className="shrink-0 w-64 h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <div className="mb-4">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
        Recommended For This Crew
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {recommendations.map((rec) => {
          const ui = rsvpState[rec.event_id] ?? {
            pickerOpen: false,
            submitting: null,
            error: null,
          }

          return (
            <div
              key={rec.event_id}
              className="shrink-0 snap-start w-64 bg-[#1A1A1F] rounded-2xl p-4 border border-white/5 flex flex-col gap-3"
            >
              {/* Primary business */}
              {rec.primary_business && (
                <div className="flex items-center gap-2">
                  {rec.primary_business.logo_url ? (
                    <img
                      src={rec.primary_business.logo_url}
                      alt={rec.primary_business.name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                  )}
                  <span className="text-foreground/50 text-xs font-sans truncate">
                    {rec.primary_business.name}
                  </span>
                </div>
              )}

              {/* Event info */}
              <div>
                <h3 className="font-slab-serif text-base text-white leading-tight line-clamp-2">
                  {rec.event_name}
                </h3>
                <p className="text-foreground/40 text-xs font-sans mt-1">
                  {formatEventDate(rec.event_date)}
                  {rec.event_time ? ` · ${rec.event_time}` : ""}
                  {rec.venue ? ` · ${rec.venue}` : ""}
                </p>
              </div>

              {/* Bundle */}
              {rec.bundle && (
                <div className="bg-[#121113] rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-sans truncate">{rec.bundle.name}</p>
                    {rec.bundle.discount_percent != null && (
                      <span className="text-accent text-xs font-label shrink-0">
                        {rec.bundle.discount_percent}% off
                      </span>
                    )}
                  </div>
                  {bundleTags(rec.bundle.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bundleTags(rec.bundle.tags).map((tag) => (
                        <span
                          key={tag}
                          className="bg-white/5 text-foreground/50 text-[10px] font-label rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleViewBundle(rec.bundle!.id)}
                    className="text-accent-secondary text-xs font-sans hover:text-accent-secondary/80 transition-colors border border-accent-secondary/20 rounded-lg py-1.5"
                  >
                    View Bundle
                  </button>
                </div>
              )}

              {/* RSVP */}
              {rec.rsvp && (
                <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-white/5">
                  <p className="text-foreground/50 text-xs font-sans">
                    {rec.rsvp.going_count} Going, {rec.rsvp.maybe_count} Maybe
                  </p>

                  {ui.pickerOpen ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRsvp(rec.event_id, "going")}
                          disabled={ui.submitting !== null}
                          className="flex-1 bg-accent text-black text-xs font-sans font-medium rounded-lg py-1.5 hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                          {ui.submitting === "going" ? "…" : "Going"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRsvp(rec.event_id, "maybe")}
                          disabled={ui.submitting !== null}
                          className="flex-1 bg-white/5 text-foreground/70 text-xs font-sans font-medium rounded-lg py-1.5 hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          {ui.submitting === "maybe" ? "…" : "Maybe"}
                        </button>
                      </div>
                      {ui.error && (
                        <p className="text-red-400 text-[11px] font-sans">{ui.error}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPicker(rec.event_id)}
                      className="bg-accent/10 text-accent text-xs font-sans font-medium rounded-lg py-1.5 hover:bg-accent/20 transition-colors"
                    >
                      RSVP Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
