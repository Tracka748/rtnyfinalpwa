const AVATAR_COLORS = ["#59FFA0", "#1AC8ED", "#FF6B6B", "#FFD93D", "#C77DFF"]
const PLACEHOLDER_INITIALS = ["A", "B", "C", "D", "E"]

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
  const visible = Math.min(count, max)
  const overflow = count - visible

  return (
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
      </div>
      {overflow > 0 && (
        <span className="text-foreground/40 text-xs font-sans">+{overflow}</span>
      )}
    </div>
  )
}
