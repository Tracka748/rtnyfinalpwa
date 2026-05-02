const MILESTONES = [
  { threshold: 3, icon: "🎟️", label: "Group Discount" },
  { threshold: 5, icon: "⚡", label: "Skip the Line" },
  { threshold: 7, icon: "🍾", label: "Bottle Service" },
]

interface UnlockTimelineProps {
  totalMembers: number
}

export function UnlockTimeline({ totalMembers }: UnlockTimelineProps) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">
        Unlock Milestones
      </p>
      <div className="flex items-center">
        {MILESTONES.map((m, i) => {
          const unlocked = totalMembers >= m.threshold
          return (
            <div key={m.threshold} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-colors ${
                    unlocked
                      ? "bg-accent/20 border-accent"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {m.icon}
                </div>
                <span
                  className={`text-xs font-sans text-center leading-tight max-w-[56px] ${
                    unlocked ? "text-accent" : "text-foreground/30"
                  }`}
                >
                  {m.label}
                </span>
              </div>
              {i < MILESTONES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                    totalMembers >= MILESTONES[i + 1].threshold
                      ? "bg-accent"
                      : "bg-white/10"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
