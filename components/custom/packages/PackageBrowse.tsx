'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PackageCard } from './PackageCard'
import { filterByOccasion, mergeCards, occasionChips } from '@/lib/package-browse'
import type { PublicCard } from '@/lib/theme-package-public'

interface Page {
  packages: PublicCard[]
  has_more: boolean
  next_offset: number | null
}

const chipClass = (active: boolean) =>
  `font-sans min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium touch-manipulation transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0] ${
    active
      ? 'border-[#59FFA0] bg-[#59FFA0] text-[#121113]'
      : 'border-white/15 bg-[#1a1a1a] text-[#F9FDFF] hover:border-white/30'
  }`

/** The /packages page body. The first page arrives from the server; "Load more" fetches the rest. */
export function PackageBrowse({ initial }: { initial: Page }) {
  const [packages, setPackages] = useState(initial.packages)
  const [hasMore, setHasMore] = useState(initial.has_more)
  const [nextOffset, setNextOffset] = useState(initial.next_offset)
  const [selected, setSelected] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const chips = useMemo(() => occasionChips(packages), [packages])
  const visible = useMemo(() => filterByOccasion(packages, selected), [packages, selected])
  const selectedLabel = chips.find(c => c.key === selected)?.label ?? ''

  async function loadMore() {
    if (nextOffset === null || loadingMore) return
    setLoadingMore(true)
    setLoadError(false)
    try {
      const res = await fetch(`/api/v1/theme-packages?offset=${nextOffset}`)
      const json = await res.json()
      if (!res.ok || !json?.success || !Array.isArray(json.data?.packages)) throw new Error('bad response')
      const data = json.data as Page
      setPackages(prev => mergeCards(prev, data.packages))
      setHasMore(!!data.has_more)
      setNextOffset(typeof data.next_offset === 'number' ? data.next_offset : null)
    } catch {
      setLoadError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="font-header text-3xl font-bold text-[#F9FDFF]">Curated Packages</h1>
      <p className="font-sans mt-1 text-sm text-[#a8a8a8]">
        Hand-built celebrations for Rochester. Pick one, reserve it, or make it your own.
      </p>

      {packages.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-[#1a1a1a] p-8 text-center">
          <p className="font-header text-xl font-bold text-[#F9FDFF]">No packages yet</p>
          <p className="font-sans mt-2 text-sm text-[#a8a8a8]">
            We&apos;re putting together something special. Check back soon, or see what&apos;s on in the meantime.
          </p>
          <Link
            href="/events"
            className="font-sans mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[#59FFA0] px-5 text-sm font-semibold text-[#121113] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <>
          {chips.length >= 2 && (
            <div
              className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Filter by occasion"
            >
              <button type="button" aria-pressed={selected === null} onClick={() => setSelected(null)} className={chipClass(selected === null)}>
                All
              </button>
              {chips.map(chip => (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={selected === chip.key}
                  onClick={() => setSelected(chip.key)}
                  className={chipClass(selected === chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-[#1a1a1a] p-8 text-center">
              <p className="font-sans text-sm text-[#a8a8a8]">
                Nothing under {selectedLabel || 'that occasion'} right now. Try another, or see everything.
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="font-sans mt-4 min-h-[44px] rounded-full border border-white/15 px-5 text-sm font-medium text-[#F9FDFF] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]"
              >
                Show all packages
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(card => (
                <PackageCard key={card.key} card={card} />
              ))}
            </div>
          )}

          {hasMore && nextOffset !== null && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {loadError && (
                <p role="alert" className="font-sans text-sm text-[#a8a8a8]">
                  Couldn&apos;t load more. Please try again.
                </p>
              )}
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="font-sans min-h-[44px] rounded-full border border-white/15 bg-[#1a1a1a] px-6 text-sm font-medium text-[#F9FDFF] touch-manipulation disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
