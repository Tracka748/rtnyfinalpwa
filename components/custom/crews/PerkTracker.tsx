interface PerkTrackerProps {
  lockedInCount: number
  totalMembers: number
}

export function PerkTracker({ lockedInCount, totalMembers }: PerkTrackerProps) {
  const underThreshold = totalMembers < 3
  const pct = underThreshold
    ? (lockedInCount / 3) * 100
    : totalMembers > 0
    ? (lockedInCount / totalMembers) * 100
    : 0
  const full = !underThreshold && totalMembers >= 3 && lockedInCount >= totalMembers

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
      {full ? (
        <p className="text-accent text-xs font-sans">🎉 Full crew locked in!</p>
      ) : underThreshold ? (
        <p className="text-foreground/50 text-xs font-sans">
          {lockedInCount} of 3 needed to unlock first perk
        </p>
      ) : (
        <p className="text-foreground/50 text-xs font-sans">
          {lockedInCount} of {totalMembers} members locked in
        </p>
      )}
    </div>
  )
}
