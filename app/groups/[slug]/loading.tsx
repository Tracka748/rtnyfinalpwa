export default function GroupDetailLoading() {
  return (
    <main className="min-h-screen bg-[#121113]">
      {/* Hero skeleton */}
      <div className="w-full h-[320px] md:h-[420px] bg-white/5 animate-pulse rounded-b-2xl" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Posts skeleton */}
        <div>
          <div className="h-6 w-24 bg-white/5 animate-pulse rounded-lg mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 animate-pulse rounded-xl h-24" />
            ))}
          </div>
        </div>

        {/* Events skeleton */}
        <div>
          <div className="h-6 w-48 bg-white/5 animate-pulse rounded-lg mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 animate-pulse rounded-2xl aspect-[3/4]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
