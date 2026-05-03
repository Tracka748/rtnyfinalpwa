'use client'

import { useState } from 'react'

// Matches the EnrichedStop shape persisted by PlanMyDay
interface SavedStop {
  stop: {
    name: string
    category: string
    address: string | null
    estimated_arrival: string   // "HH:MM"
    estimated_spend: number
    duration_minutes: number
  }
  segment: string
  locked: boolean
}

interface SavedPlan {
  id: string
  plan_date: string | null
  stops: SavedStop[]
  total_estimated_spend: number | null
  total_duration_minutes: number | null
  created_at: string | null
}

interface Props {
  plans: SavedPlan[]
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export function SavedDayPlans({ plans }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (plans.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🗒️</span>
          <h2 className="text-xl font-bold text-foreground font-slab-serif">
            Saved Day Plans
          </h2>
        </div>
        <div className="text-center py-8 text-foreground/30">
          <span className="text-3xl">🗒️</span>
          <p className="mt-2 text-sm">No saved day plans yet.</p>
          <a href="/plan" className="text-accent text-sm hover:underline mt-1 block">
            Build your first day →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🗒️</span>
        <h2 className="text-xl font-bold text-foreground font-slab-serif">
          Saved Day Plans
        </h2>
        <span className="ml-auto text-xs text-foreground/40">
          {plans.length} saved
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const expanded  = expandedId === plan.id
          const stopCount = plan.stops.length
          const date = plan.plan_date
            ? new Date(plan.plan_date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })
            : 'Unknown date'
          const spend = plan.total_estimated_spend != null
            ? `$${Number(plan.total_estimated_spend).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : null

          return (
            <div
              key={plan.id}
              className="rounded-lg border border-[#2A2A2A] border-l-2 border-l-accent bg-[#1A1A1A] p-5 flex flex-col gap-3 hover:bg-white/5 transition"
            >
              {/* Card header */}
              <div>
                <p className="font-[family-name:var(--font-rokkitt)] text-base font-bold text-[#F9FDFF]">
                  📅 {date}
                </p>
                <div className="flex items-center gap-3 mt-1.5 font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
                  <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">
                    {stopCount} stop{stopCount !== 1 ? 's' : ''}
                  </span>
                  {spend && (
                    <>
                      <span className="text-[#2A2A2A]">·</span>
                      <span className="text-[#59FFA0]">{spend} est.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded itinerary */}
              {expanded && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  {plan.stops.map((enriched, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs text-[#A0A0A0]/60 w-16 shrink-0 pt-0.5 font-[family-name:var(--font-rubik)]">
                        {formatTime(enriched.stop.estimated_arrival)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#F9FDFF] font-[family-name:var(--font-rubik)] truncate">
                          {enriched.stop.name}
                        </p>
                        <p className="text-xs text-[#A0A0A0] capitalize truncate">
                          {enriched.stop.category}
                          {enriched.stop.address ? ` · ${enriched.stop.address}` : ''}
                        </p>
                        <p className="text-xs text-[#59FFA0] mt-0.5 font-[family-name:var(--font-rubik)]">
                          ${enriched.stop.estimated_spend.toLocaleString()} est.
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3">
                    <a
                      href={`/plan?replay=${plan.id}`}
                      className="text-xs text-[#1ac8ed] hover:underline font-[family-name:var(--font-rubik)]"
                    >
                      Regenerate from this plan →
                    </a>
                  </div>
                </div>
              )}

              {/* Toggle button */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : plan.id)}
                className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[#2A2A2A] text-[#F9FDFF]/70 font-[family-name:var(--font-rubik)] text-sm hover:border-[#1ac8ed]/40 hover:text-[#1ac8ed] transition-colors"
              >
                {expanded ? 'Close ↑' : 'View Plan ↓'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
