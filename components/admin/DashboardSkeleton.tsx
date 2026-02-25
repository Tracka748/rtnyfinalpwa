export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/10 rounded-lg" />
          <div className="h-4 w-48 bg-white/5 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-white/5 rounded-lg" />
          <div className="h-9 w-28 bg-white/5 rounded-lg" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 h-32" />
        ))}
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6 h-64" />
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-64" />
      </div>

      {/* Second charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-56" />
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-56" />
      </div>

      {/* Activity skeleton */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-80" />
    </div>
  );
}
