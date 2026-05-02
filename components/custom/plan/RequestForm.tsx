'use client'

import { cn } from '@/lib/utils'
import type { SelectedService, PlanItem } from '@/hooks/usePlanBuilder'

interface RequestFormProps {
  selectedServices: SelectedService[]
  estimatedTotal: number
  notes: string
  contactEmail: string
  submitting: boolean
  submitError: string | null
  onNotesChange: (v: string) => void
  onEmailChange: (v: string) => void
  onSubmit: () => void
  onBack: () => void
  onRemoveService: (serviceId: string) => void
  planItems?: PlanItem[]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-label text-[10px] tracking-widest text-[#7DD8E8] mb-3">{children}</h4>
  )
}

export function RequestForm({
  selectedServices,
  estimatedTotal,
  notes,
  contactEmail,
  submitting,
  submitError,
  onNotesChange,
  onEmailChange,
  onSubmit,
  onBack,
  onRemoveService,
  planItems = [],
}: RequestFormProps) {
  const inputBase =
    'w-full bg-[#1a1819] border border-[#2a2829] rounded-xl px-4 py-3 text-[#f9fdff] font-sans text-sm ' +
    'placeholder:text-[#7DD8E8]/40 outline-none transition-all duration-200 ' +
    'focus:border-[#59ffa0] focus:ring-2 focus:ring-[#59ffa0]/20'

  const isEmailValid = contactEmail === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)

  // Group selected services by vendor
  const byVendor = selectedServices.reduce<Record<string, SelectedService[]>>((acc, s) => {
    if (!acc[s.vendorName]) acc[s.vendorName] = []
    acc[s.vendorName].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Vendor-level plan items */}
      {planItems.length > 0 && (
        <div>
          <SectionLabel>Vendors Added</SectionLabel>
          <div className="rounded-xl border border-[#2a2829] bg-[#1a1819] overflow-hidden divide-y divide-[#2a2829]">
            {planItems.map(item => (
              <div key={item.vendorId} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[#f9fdff] text-sm font-sans font-medium leading-snug">{item.vendorName}</p>
                  <p className="text-[#7DD8E8] text-[10px] mt-0.5 capitalize">{item.vendorType}</p>
                </div>
                {item.basePrice !== null && (
                  <span className="text-[#59ffa0] font-slab-serif font-bold text-sm shrink-0">
                    from ${item.basePrice.toLocaleString()}
                    {item.priceUnit === 'per_hour' ? '/hr' : item.priceUnit === 'per_person' ? '/person' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected services review */}
      <div>
        <SectionLabel>Selected Services</SectionLabel>

        {selectedServices.length === 0 ? (
          <div className="p-6 rounded-xl border border-[#2a2829] bg-[#1a1819] text-center">
            <p className="text-[#7DD8E8] text-sm font-sans">
              No services selected.{' '}
              <button type="button" onClick={onBack} className="text-[#59ffa0] underline underline-offset-2">
                Go back to browse vendors.
              </button>
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#2a2829] bg-[#1a1819] overflow-hidden divide-y divide-[#2a2829]">
            {Object.entries(byVendor).map(([vendorName, services]) => (
              <div key={vendorName}>
                {/* Vendor header */}
                <div className="px-4 py-2 bg-[#242324]/50 flex items-center gap-2">
                  <span className="text-[11px] text-[#7DD8E8] font-label">{vendorName}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-sans"
                    style={{ background: 'rgba(89,255,160,0.08)', color: '#59ffa0', border: '1px solid rgba(89,255,160,0.2)' }}
                  >
                    {services[0].vendorTier}
                  </span>
                </div>

                {/* Services under this vendor */}
                {services.map(s => (
                  <div key={s.serviceId} className="px-4 py-3 flex items-center justify-between gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f9fdff] text-sm font-sans font-medium leading-snug">{s.serviceTitle}</p>
                      <p className="text-[#7DD8E8] text-[10px] mt-0.5 capitalize">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.effectivePrice !== s.basePrice && (
                        <span className="text-[11px] text-[#7DD8E8]/50 line-through">
                          ${s.basePrice.toLocaleString()}
                        </span>
                      )}
                      <span className="text-[#59ffa0] font-slab-serif font-bold text-sm">
                        ${s.effectivePrice.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveService(s.serviceId)}
                        className="opacity-0 group-hover:opacity-100 text-[#7DD8E8]/50 hover:text-red-400 transition-all duration-150 p-0.5"
                        aria-label="Remove"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Total row */}
            <div className="px-4 py-3 bg-[#121113]/40 flex items-center justify-between">
              <span className="text-[#7DD8E8] text-xs font-label">Estimated Total</span>
              <span className="text-[#59ffa0] font-slab-serif font-bold text-xl">
                ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contact email */}
      <div>
        <SectionLabel>Contact Email (optional)</SectionLabel>
        <input
          type="email"
          value={contactEmail}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          className={cn(inputBase, !isEmailValid && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20')}
        />
        {!isEmailValid && (
          <p className="text-red-400 text-xs mt-1.5 font-sans">Please enter a valid email address.</p>
        )}
        <p className="text-[#7DD8E8]/50 text-[11px] mt-1.5 font-sans">
          We'll send your plan summary here. Anonymous submissions are welcome.
        </p>
      </div>

      {/* Notes */}
      <div>
        <SectionLabel>Additional Notes (optional)</SectionLabel>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Any special requests, venue details, or other information..."
          rows={4}
          className={cn(inputBase, 'resize-none leading-relaxed')}
        />
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-sans">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#f9fdff] transition-all duration-200 disabled:opacity-40"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !isEmailValid}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl font-sans font-semibold text-sm transition-all duration-200',
            submitting || !isEmailValid
              ? 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
              : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20'
          )}
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z" />
              </svg>
              Submitting…
            </>
          ) : (
            <>
              Submit Request
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
