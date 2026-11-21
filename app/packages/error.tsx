'use client'

import Link from 'next/link'

// Covers /packages and /packages/[key]. The error itself is never rendered.
export default function PackagesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#121113] px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1a1a1a] p-8 text-center">
        <h1 className="font-header text-2xl font-bold text-[#F9FDFF]">Something went wrong</h1>
        <p className="font-sans mt-2 text-sm text-[#a8a8a8]">
          We couldn&apos;t load this page just now. Give it another try.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="font-sans min-h-[44px] rounded-full bg-[#59FFA0] px-5 text-sm font-semibold text-[#121113] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="font-sans inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 px-5 text-sm font-medium text-[#F9FDFF] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
