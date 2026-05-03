'use client'

import { cn } from '@/lib/utils'
import type { Vendor, PlanItem } from '@/hooks/usePlanBuilder'
import { VendorCard } from './VendorCard'

const CATEGORIES = [
  { value: 'all',            label: 'All',            icon: '✨' },
  { value: 'dj',            label: 'DJ',              icon: '🎧' },
  { value: 'photography',   label: 'Photography',     icon: '📸' },
  { value: 'videography',   label: 'Videography',     icon: '🎬' },
  { value: 'catering',      label: 'Catering',        icon: '🍽️' },
  { value: 'lighting',      label: 'Lighting',        icon: '💡' },
  { value: 'decor',         label: 'Decor',           icon: '🌸' },
  { value: 'bartending',    label: 'Bar',             icon: '🍸' },
  { value: 'entertainment', label: 'Entertainment',   icon: '🎭' },
  { value: 'security',      label: 'Security',        icon: '🛡️' },
  { value: 'venue',         label: 'Venue',           icon: '🏛️' },
]

function VendorSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] overflow-hidden animate-pulse">
      <div className="p-4 border-b border-[#2a2829]">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#242324]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-[#242324] rounded-full w-2/3" />
            <div className="h-2.5 bg-[#242324] rounded-full w-1/3" />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-[#242324]/60 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

interface VendorBrowserProps {
  vendors: Vendor[]
  loading: boolean
  error: string | null
  categoryFilter: string
  selectedServiceIds: Set<string>
  eventDate: string
  planItems: PlanItem[]
  onCategoryChange: (category: string) => void
  onToggleService: (serviceId: string) => void
  onAddToPlan: (vendor: Vendor) => void
  onBack: () => void
  onNext: () => void
  selectedCount: number
}

export function VendorBrowser({
  vendors,
  loading,
  error,
  categoryFilter,
  selectedServiceIds,
  eventDate,
  planItems,
  onCategoryChange,
  onToggleService,
  onAddToPlan,
  onBack,
  onNext,
  selectedCount,
}: VendorBrowserProps) {
  return (
    <div>
      {/* Category filter scroll */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 pt-4 pb-5">
        <div className="flex gap-3 w-max">
          {CATEGORIES.map(cat => {
            const active = categoryFilter === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onCategoryChange(cat.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-sans whitespace-nowrap transition-all duration-200',
                  active
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#59ffa0]/30'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-[#2a2829] text-xs">←</span>
        <div className="flex-1 border-t border-dashed border-[#2a2829]" />
        <span className="text-[#7DD8E8]/40 text-[10px] font-label tracking-widest">scroll</span>
        <div className="flex-1 border-t border-dashed border-[#2a2829]" />
        <span className="text-[#2a2829] text-xs">→</span>
      </div>

      {/* Result count / state */}
      {!loading && !error && (
        <p className="text-[#7DD8E8] text-xs font-sans mt-4">
          {vendors.length === 0
            ? 'No vendors found for your criteria — try adjusting your filters.'
            : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} available`}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-sans mt-4">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <VendorSkeleton key={i} />)
          : vendors.map(vendor => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                selectedServiceIds={selectedServiceIds}
                onToggleService={onToggleService}
                eventDate={eventDate}
                planItems={planItems}
                onAddToPlan={onAddToPlan}
              />
            ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-12 pb-16">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#f9fdff] transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20 transition-all duration-200"
        >
          Review
          {selectedCount > 0 && (
            <span className="bg-[#121113]/20 text-[#121113] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
