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

interface PerkTrackerProps {
  memberCount: number
  totalEvents: number
  reviewCount: number
}

export function PerkTracker({ memberCount, totalEvents, reviewCount }: PerkTrackerProps) {
  const values: MilestoneValues = { memberCount, totalEvents, reviewCount }

  const allDone = MILESTONES.every((m) => (m.getValue(values) ?? 0) >= m.threshold)
  const next = allDone ? null : MILESTONES.find((m) => (m.getValue(values) ?? 0) < m.threshold)!

  const pct = allDone
    ? 100
    : Math.min(100, ((next.getValue(values) ?? 0) / next.threshold) * 100)

  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-2">
        Perk Tracker
      </p>
      <div className="rounded-full bg-white/10 h-2 w-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {allDone ? (
        <p className="text-accent text-xs font-sans">🎉 All crew milestones unlocked!</p>
      ) : (
        <p className="text-foreground/50 text-xs font-sans">
          {next.getValue(values) ?? 0} of {next.threshold} needed to unlock {next.label}
        </p>
      )}
    </div>
  )
}
