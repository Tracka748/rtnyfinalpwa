interface MilestoneValues {
  memberCount: number
  totalEvents: number
  reviewCount: number
}

const MILESTONES = [
  { icon: '🧑‍🤝‍🧑', label: 'Squad Up',      getValue: (p: MilestoneValues) => p.memberCount, threshold: 3 },
  { icon: '🎟️',      label: 'First Outing',  getValue: (p: MilestoneValues) => p.totalEvents,  threshold: 1 },
  { icon: '⭐',      label: 'Critics Circle', getValue: (p: MilestoneValues) => p.reviewCount,  threshold: 6 },
  { icon: '👑',      label: 'Crew Royalty',   getValue: (p: MilestoneValues) => p.memberCount,  threshold: 5 },
]

interface UnlockTimelineProps {
  memberCount: number
  totalEvents: number
  reviewCount: number
}

export function UnlockTimeline({ memberCount, totalEvents, reviewCount }: UnlockTimelineProps) {
  const values: MilestoneValues = { memberCount, totalEvents, reviewCount }

  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
        Unlock Milestones
      </p>
      <div className="flex items-center">
        {MILESTONES.map((m, i) => {
          const unlocked = m.getValue(values) >= m.threshold
          const isUnlocked = i < MILESTONES.length - 1 && MILESTONES[i + 1].getValue(values) >= MILESTONES[i + 1].threshold
          return (
            <div key={m.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                {unlocked ? (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      boxShadow: '0 0 10px rgba(89, 255, 160, 0.4)',
                      border: '2px solid #59FFA0',
                      backgroundColor: 'rgba(89, 255, 160, 0.2)',
                    }}
                  >
                    <span className="text-sm" style={{ filter: 'drop-shadow(0 0 4px #59FFA0)' }}>
                      {m.icon}
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                    <span className="text-sm opacity-30">{m.icon}</span>
                  </div>
                )}
                {unlocked ? (
                  <span className="text-accent font-sans text-xs text-center mt-1">{m.label}</span>
                ) : (
                  <span className="text-foreground/30 font-sans text-xs text-center mt-1">{m.label}</span>
                )}
              </div>
              {i < MILESTONES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 ${isUnlocked ? "bg-accent" : "bg-white/10"}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
