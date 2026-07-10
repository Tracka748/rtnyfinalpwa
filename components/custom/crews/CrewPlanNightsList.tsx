"use client"

import { useEffect, useState } from "react"

interface PlanNight {
  id: string
  name: string
  description: string | null
  created_at: string
  event_count: number
}

interface CrewPlanNightsListProps {
  crewId: string
  refreshSignal?: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function CrewPlanNightsList({ crewId, refreshSignal }: CrewPlanNightsListProps) {
  const [plans, setPlans] = useState<PlanNight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchPlans() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/crews/${crewId}/plan-nights`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setPlans(json.plans ?? [])
        }
      } catch {
        // Fail quietly — section just shows empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPlans()
    return () => {
      cancelled = true
    }
  }, [crewId, refreshSignal])

  if (loading) {
    return (
      <div className="mb-4">
        <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
          Your Plans
        </p>
        <div className="bg-[#1A1A1F] rounded-2xl p-4 flex flex-col gap-2">
          <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </div>
    )
  }

  if (plans.length === 0) return null

  return (
    <div className="mb-4">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
        Your Plans
      </p>
      <div className="bg-[#1A1A1F] rounded-2xl p-4">
        {plans.map((plan, i) => (
          <div key={plan.id}>
            {i > 0 && <div className="border-t border-white/5" />}
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-sans truncate">{plan.name}</p>
                <p className="text-foreground/40 text-xs font-sans">
                  Created {formatDate(plan.created_at)}
                </p>
              </div>
              <span className="shrink-0 bg-white/5 text-foreground/40 text-xs font-label rounded-full px-2 py-0.5">
                {plan.event_count} event{plan.event_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
