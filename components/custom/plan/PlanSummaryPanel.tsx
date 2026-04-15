'use client'

import { cn } from '@/lib/utils'
import type { SelectedService } from '@/hooks/usePlanBuilder'

interface PlanSummaryPanelProps {
  selectedServices: SelectedService[]
  estimatedTotal: number
  onRemoveService: (serviceId: string) => void
  /** When true renders as a full-width horizontal summary bar (mobile/bottom) */
  compact?: boolean
}

export function PlanSummaryPanel({
  selectedServices,
  estimatedTotal,
  onRemoveService,
  compact = false,
}: PlanSummaryPanelProps) {
  if (compact) {
    // Mobile bottom bar — shown when at least one service is selected
    if (selectedServices.length === 0) return null
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-[#2a2829] bg-[#1a1819]/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <p className="text-[#7DD8E8] text-xs font-label">
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-[#59ffa0] font-slab-serif font-bold text-lg leading-tight">
              ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
            {selectedServices.slice(0, 3).map(s => (
              <span
                key={s.serviceId}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#59ffa0]/10 border border-[#59ffa0]/20 text-[#59ffa0] font-sans"
              >
                {s.serviceTitle}
              </span>
            ))}
            {selectedServices.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8]">
                +{selectedServices.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Desktop sidebar panel
  return (
    <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] overflow-hidden sticky top-24">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2829] flex items-center justify-between">
        <h3 className="font-header text-sm font-bold text-[#f9fdff]">Your Plan</h3>
        {selectedServices.length > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#59ffa0]/10 border border-[#59ffa0]/20 text-[#59ffa0] font-label">
            {selectedServices.length} item{selectedServices.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Empty state */}
      {selectedServices.length === 0 && (
        <div className="px-4 py-8 text-center">
          <div className="text-3xl mb-2">🛒</div>
          <p className="text-[#7DD8E8] text-xs font-sans leading-relaxed">
            Select services from vendors to add them to your plan.
          </p>
        </div>
      )}

      {/* Service list */}
      {selectedServices.length > 0 && (
        <div className="divide-y divide-[#2a2829]">
          {selectedServices.map(service => (
            <div key={service.serviceId} className="px-4 py-3 flex items-start gap-2 group">
              <div className="flex-1 min-w-0">
                <p className="text-[#f9fdff] text-xs font-sans font-medium leading-snug line-clamp-1">
                  {service.serviceTitle}
                </p>
                <p className="text-[#7DD8E8] text-[10px] mt-0.5 line-clamp-1">{service.vendorName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#59ffa0] text-xs font-slab-serif font-bold">
                  ${service.effectivePrice.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveService(service.serviceId)}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-[#242324] border border-[#2a2829] flex items-center justify-center text-[#7DD8E8] hover:text-red-400 hover:border-red-500/30 transition-all duration-150"
                  aria-label="Remove"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {selectedServices.length > 0 && (
        <div className="px-4 py-3 border-t border-[#2a2829] bg-[#121113]/40">
          <div className="flex items-center justify-between">
            <span className="text-[#7DD8E8] text-xs font-label">Estimated Total</span>
            <span className="text-[#59ffa0] font-slab-serif font-bold text-base">
              ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[#7DD8E8]/50 text-[10px] mt-1 leading-relaxed">
            Prices may vary. Dynamic pricing applied for selected date.
          </p>
        </div>
      )}
    </div>
  )
}
