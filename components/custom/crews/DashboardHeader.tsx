interface Crew {
  id: string
  created_by: string
  member_count: number
}

interface DashboardHeaderProps {
  crews: Crew[]
  userId: string
  loading?: boolean
  onCreateCrew: () => void
  onJoinCrew: () => void
}

export function DashboardHeader({
  crews,
  userId,
  loading,
  onCreateCrew,
  onJoinCrew,
}: DashboardHeaderProps) {
  if (loading) {
    return (
      <div className="bg-[#1A1A1F] rounded-2xl p-4 mb-6 h-20 animate-pulse" />
    )
  }

  const crewCount = crews.length
  const isCaptain = crews.some((c) => c.created_by === userId)

  return (
    <div className="bg-[#1A1A1F] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-stretch divide-x divide-white/5 flex-1 min-w-0">
        {/* Stat 1: Crews */}
        <div className="pl-0 pr-4 flex flex-col justify-center min-w-0">
          <p className="font-label text-xs uppercase tracking-widest text-foreground/40">
            Crews
          </p>
          <p className="font-slab-serif text-2xl text-white leading-tight">
            {crewCount}
          </p>
        </div>

        {/* Stat 2: Total Saved */}
        <div className="px-4 flex flex-col justify-center min-w-0">
          <p className="font-label text-xs uppercase tracking-widest text-foreground/40">
            Total Saved
          </p>
          <p className="font-slab-serif text-2xl text-accent leading-tight">
            $0.00
          </p>
        </div>

        {/* Stat 3: Status */}
        <div className="pl-4 pr-0 flex flex-col justify-center min-w-0">
          <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-1">
            Status
          </p>
          {isCaptain ? (
            <span className="bg-accent/10 text-accent font-label text-sm rounded-full px-3 py-1 w-fit whitespace-nowrap">
              Captain
            </span>
          ) : (
            <span className="text-foreground/40 text-sm font-sans whitespace-nowrap">Member</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <button
          onClick={onJoinCrew}
          className="flex-1 sm:flex-none border border-accent/40 text-accent text-sm rounded-xl px-3 py-1.5 font-sans hover:bg-accent/10 transition-colors whitespace-nowrap"
        >
          Join with Code
        </button>
        <button
          onClick={onCreateCrew}
          className="flex-1 sm:flex-none bg-accent text-black text-sm font-sans rounded-xl px-3 py-1.5 font-medium hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          + New Crew
        </button>
      </div>
    </div>
  )
}
