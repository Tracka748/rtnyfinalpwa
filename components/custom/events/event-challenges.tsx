'use client'

import { useEffect, useState } from 'react'

interface Challenge {
  icon: string
  label: string
  reason: string
  completed?: boolean
}

const CHALLENGES: Challenge[] = [
  { icon: '🎟️', label: 'Buy a Ticket',      reason: 'ticket_purchase' },
  { icon: '🤍', label: 'Save This Event',    reason: 'event_saved'     },
  { icon: '📲', label: 'Share This Event',   reason: 'event_shared'    },
  { icon: '📅', label: 'Daily Visit',        reason: 'daily_visit'     },
]

interface EventChallengesProps {
  eventId: string
  completed?: boolean
}

export function EventChallenges({ eventId, completed = false }: EventChallengesProps) {
  const [pointMap, setPointMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/rewards/point-rules')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPointMap(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalPoints = CHALLENGES.reduce((sum, c) => sum + (pointMap[c.reason] ?? 0), 0)

  return (
    <div className="bg-[#0d0f14] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="text-base">🏆</span>
        <span className="font-label text-[11px] uppercase tracking-widest text-[#59FFA0] font-semibold">
          Earn Points
        </span>
        <div className="flex-1 h-px bg-[#59FFA0]/20 ml-2" />
      </div>
      <p className="px-4 pb-3 text-[11px] font-label text-white/30 tracking-wide">
        Complete challenges to earn rewards
      </p>

      {loading ? (
        <>
          {CHALLENGES.map((c) => (
            <div key={c.reason} className="h-[44px] bg-white/[0.03] rounded animate-pulse mx-4 my-2" />
          ))}
        </>
      ) : (
        <>
          {CHALLENGES.map((challenge) => {
            const pts = pointMap[challenge.reason] ?? 0
            return (
              <div
                key={challenge.reason}
                className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-b-0 group hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{challenge.icon}</span>
                  <span className="font-label text-[13px] uppercase tracking-wider text-white/70 group-hover:text-white/90 transition-colors">
                    {challenge.label}
                  </span>
                </div>

                {completed ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-label uppercase tracking-widest text-white/30 line-through">
                      +{pts} pts
                    </span>
                    <span className="text-[#59FFA0] text-xs">✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif text-[15px] font-bold text-[#59FFA0]">
                      +{pts}
                    </span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-white/30">
                      pts
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center justify-between px-4 py-3 bg-[#59FFA0]/[0.04] border-t border-[#59FFA0]/10">
            <span className="font-label text-[11px] uppercase tracking-widest text-white/30">
              Potential earnings
            </span>
            <div className="flex items-center gap-1">
              <span className="font-serif font-bold text-[17px] text-[#59FFA0]">
                +{totalPoints}
              </span>
              <span className="font-label text-[10px] uppercase tracking-widest text-[#59FFA0]/50">
                pts
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
