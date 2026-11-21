// Skeleton for /packages only. It lives in the (browse) group so it never shows in front of a package page.
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#121113]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6" aria-busy="true" aria-label="Loading packages">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[#2a2929]" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-[#2a2929]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
              <div className="aspect-[4/3] w-full animate-pulse bg-[#2a2929]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-[#2a2929]" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-[#2a2929]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#2a2929]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
