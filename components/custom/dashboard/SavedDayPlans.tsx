'use client'

import { useState } from 'react'
import type { SavedPlanView } from '@/lib/day-plan'
import { getAvatarEmoji } from '@/lib/business-avatar'
import { COVER_SCRIM_ALPHA, COVER_TEXT, ROW_SURFACE } from '@/lib/cover-contrast'

// Plans arrive normalised by lib/day-plan-read.ts (any stored shape), with logo_url and
// cover_image_url resolved server-side from public.businesses by business_id (http(s) only).
// No image URL from the plan data is used.
interface Props {
  plans: SavedPlanView[]
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
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
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
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
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
                  {plan.stops.map((stop, i) => (
                    // Card and cover treatment follow the Plan My Day stop card (PlanMyDay.tsx StopCard),
                    // with a stronger solid scrim so every text colour meets 4.5:1 (lib/cover-contrast.ts).
                    <div
                      key={i}
                      className="relative overflow-hidden rounded-[26px] border border-[#2A2A2A] shadow-lg"
                      style={{ backgroundColor: ROW_SURFACE }}
                    >
                      {stop.cover_image_url && (
                        <>
                          <img
                            src={stop.cover_image_url}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: 'blur(2px) brightness(0.75)', transform: 'scale(1.05)' }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: `rgba(0,0,0,${COVER_SCRIM_ALPHA})` }}
                          />
                        </>
                      )}

                      <div className="relative z-10 flex items-start gap-3 p-3">
                        {/* Fixed logo slot: the stop card's avatar markup, with its emoji fallback. */}
                        <div className="w-10 h-10 rounded-xl border border-[#2a2829] overflow-hidden shrink-0 flex items-center justify-center bg-[#1a1819]">
                          {stop.logo_url ? (
                            <img
                              src={stop.logo_url}
                              alt={stop.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg leading-none" aria-hidden="true">{getAvatarEmoji(stop.category)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 font-[family-name:var(--font-rubik)]">
                          {stop.time && (
                            <p className="text-sm leading-5" style={{ color: COVER_TEXT.secondary }}>
                              {formatTime(stop.time)}
                            </p>
                          )}
                          <p className="text-sm leading-5 font-medium break-words" style={{ color: COVER_TEXT.primary }}>
                            {stop.name}
                          </p>
                          <p className="text-sm leading-5 capitalize break-words" style={{ color: COVER_TEXT.secondary }}>
                            {stop.category}
                            {stop.address ? ` · ${stop.address}` : ''}
                          </p>
                          {stop.spend != null && (
                            <p className="text-sm leading-5 mt-0.5" style={{ color: COVER_TEXT.spend }}>
                              ${stop.spend.toLocaleString()} est.
                            </p>
                          )}
                        </div>
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
