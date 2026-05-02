const AVATAR_COLORS = ["#59FFA0", "#1AC8ED", "#FF6B6B", "#FFD93D", "#C77DFF"]
const PLACEHOLDER_INITIALS = ["A", "B", "C", "D", "E"]

const NEXT_MILESTONES = [
  { threshold: 3, label: "Group Discount" },
  { threshold: 5, label: "Skip the Line" },
  { threshold: 7, label: "Bottle Service" },
]

function getNextMilestone(count: number) {
  return NEXT_MILESTONES.find((m) => count < m.threshold) ?? null
}

interface MemberAvatarStackProps {
  count: number
  lockedInCount: number
  max?: number
}

export function MemberAvatarStack({
  count,
  lockedInCount,
  max = 5,
}: MemberAvatarStackProps) {
  const nextMilestone = getNextMilestone(count)
  // Expand effective max to show all real avatars when targeting a milestone
  const effectiveMax = nextMilestone ? Math.max(max, nextMilestone.threshold) : max
  const visible = Math.min(count, effectiveMax)
  const overflow = count - visible
  const placeholderCount = nextMilestone ? nextMilestone.threshold - count : 0

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <div className="flex -space-x-2">
          {Array.from({ length: visible }).map((_, i) => {
            const isLockedIn = i < lockedInCount
            return (
              <div key={i} className="relative" style={{ zIndex: visible - i }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1A1A1F] text-xs font-sans font-semibold text-[#121113]"
                  style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {PLACEHOLDER_INITIALS[i % PLACEHOLDER_INITIALS.length]}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#1A1A1F] ${
                    isLockedIn ? "bg-accent" : "bg-orange-400"
                  }`}
                />
              </div>
            )
          })}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-dashed border-white/20 bg-white/5 text-foreground/20 text-xs"
              style={{ zIndex: 0 }}
            >
              +
            </div>
          ))}
        </div>
        {overflow > 0 && (
          <span className="text-foreground/40 text-xs font-sans">+{overflow}</span>
        )}
      </div>
      {nextMilestone && (
        <p className="text-foreground/30 text-xs font-sans mt-1">
          {placeholderCount} more to unlock {nextMilestone.label}
        </p>
      )}
    </div>
  )
}
