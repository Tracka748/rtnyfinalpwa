'use client'

import { cn } from '@/lib/utils'
import type { Vendor, VendorService, PlanItem } from '@/hooks/usePlanBuilder'

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  elite:    { label: 'Elite',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  premium:  { label: 'Premium',  color: '#1ac8ed', bg: 'rgba(26,200,237,0.10)' },
  standard: { label: 'Standard', color: '#7DD8E8', bg: 'rgba(125,216,232,0.08)' },
}

function getTierConfig(tier: string) {
  return TIER_CONFIG[tier.toLowerCase()] ?? TIER_CONFIG.standard
}

// ─── Category icon map ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  dj:            '🎧',
  photography:   '📸',
  videography:   '🎬',
  catering:      '🍽️',
  lighting:      '💡',
  decor:         '🌸',
  security:      '🛡️',
  bartending:    '🍸',
  entertainment: '🎭',
  floral:        '💐',
  audio:         '🔊',
  transportation:'🚌',
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category.toLowerCase()] ?? '✨'
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number | null; count: number | null }) {
  if (!rating) return null
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1l1.3 2.7 3 .4-2.2 2.1.5 3L6 7.8 3.4 9.2l.5-3L1.7 4.1l3-.4L6 1z"
              fill={i < full ? '#f59e0b' : half && i === full ? 'url(#half)' : '#2a2829'}
            />
            {half && i === full && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#2a2829" />
                </linearGradient>
              </defs>
            )}
          </svg>
        ))}
      </div>
      <span className="text-[11px] text-[#7DD8E8]">
        {rating.toFixed(1)}{count ? ` (${count})` : ''}
      </span>
    </div>
  )
}

// ─── Service row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: VendorService
  selected: boolean
  onToggle: () => void
  eventDate: string
  dynamicMultiplier: number | null
}

function ServiceRow({ service, selected, onToggle, dynamicMultiplier }: ServiceRowProps) {
  const effectivePrice = dynamicMultiplier
    ? Math.round(service.price * dynamicMultiplier * 100) / 100
    : service.price
  const hasDiscount = dynamicMultiplier !== null && dynamicMultiplier !== 1

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer group',
        selected
          ? 'border-[#59ffa0] bg-[#59ffa0]/8'
          : 'border-[#2a2829] bg-[#121113] hover:border-[#59ffa0]/30 hover:bg-[#1a1819]'
      )}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200',
          selected ? 'border-[#59ffa0] bg-[#59ffa0]' : 'border-[#2a2829] group-hover:border-[#59ffa0]/50'
        )}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-[#121113]" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[#f9fdff] text-sm font-sans font-medium leading-snug">
              {service.title}
            </p>
            {service.description && (
              <p className="text-[#7DD8E8] text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-label text-[#7DD8E8]/60 tracking-wide">
                {getCategoryIcon(service.category)} {service.category}
              </span>
              {service.duration_hours && (
                <span className="text-[10px] text-[#7DD8E8]/50">
                  · {service.duration_hours}h
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            {hasDiscount && (
              <p className="text-[10px] text-[#7DD8E8]/50 line-through">
                ${service.price.toLocaleString()}
              </p>
            )}
            <p className={cn('text-sm font-slab-serif font-bold', selected ? 'text-[#59ffa0]' : 'text-[#f9fdff]')}>
              ${effectivePrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

interface VendorCardProps {
  vendor: Vendor
  selectedServiceIds: Set<string>
  onToggleService: (serviceId: string) => void
  eventDate: string
  planItems: PlanItem[]
  onAddToPlan: (vendor: Vendor) => void
}

export function VendorCard({ vendor, selectedServiceIds, onToggleService, eventDate, planItems, onAddToPlan }: VendorCardProps) {
  const tierConfig = getTierConfig(vendor.tier)
  const activeServices = vendor.vendor_services.filter(s => s.active !== false)
  const selectedCount = activeServices.filter(s => selectedServiceIds.has(s.id)).length
  const isInPlan = planItems.some(item => item.vendorId === vendor.id)

  // Get day-of-week multiplier for current date
  const getDynamicMultiplier = (service: VendorService): number | null => {
    if (!eventDate) return null
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const dayName = dayNames[new Date(eventDate).getDay()]
    const rule = vendor.vendor_dynamic_pricing.find(
      r => r.day_of_week?.toLowerCase() === dayName
    )
    return rule?.price_multiplier ?? null
  }

  return (
    <div className={cn(
      'rounded-2xl border bg-[#1a1819] overflow-hidden transition-all duration-300',
      selectedCount > 0
        ? 'border-[#59ffa0]/40 shadow-lg shadow-[#59ffa0]/5'
        : 'border-[#2a2829] hover:border-[#2a2829]/80'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[#2a2829]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-[#242324] border border-[#2a2829] flex items-center justify-center shrink-0 overflow-hidden">
            {vendor.profile_image_url ? (
              <img src={vendor.profile_image_url} alt={vendor.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{getCategoryIcon(vendor.type)}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-header text-base font-bold text-[#f9fdff] leading-snug">
                  {vendor.name}
                </h3>
                <p className="text-[#7DD8E8] text-xs font-sans mt-0.5">{vendor.type}</p>
              </div>

              <div className="flex items-center gap-1.5">
                {vendor.instant_book && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#59ffa0]/10 border border-[#59ffa0]/20 text-[#59ffa0] font-label">
                    ⚡ Instant
                  </span>
                )}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-label"
                  style={{ color: tierConfig.color, background: tierConfig.bg, border: `1px solid ${tierConfig.color}30` }}
                >
                  {tierConfig.label}
                </span>
              </div>
            </div>

            <div className="mt-1.5 flex items-center gap-3">
              <StarRating rating={vendor.rating} count={vendor.review_count} />
              {vendor.location && (
                <span className="text-[11px] text-[#7DD8E8]/50">📍 {vendor.location}</span>
              )}
            </div>
          </div>
        </div>

        {vendor.bio && (
          <p className="mt-2 text-[#7DD8E8] text-xs leading-relaxed line-clamp-2">{vendor.bio}</p>
        )}

        {selectedCount > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#59ffa0]/10 border border-[#59ffa0]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#59ffa0]" />
            <span className="text-[10px] text-[#59ffa0] font-label">
              {selectedCount} service{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>

      {/* Services */}
      {activeServices.length > 0 && (
        <div className="p-3 space-y-2">
          {activeServices.map(service => (
            <ServiceRow
              key={service.id}
              service={service}
              selected={selectedServiceIds.has(service.id)}
              onToggle={() => onToggleService(service.id)}
              eventDate={eventDate}
              dynamicMultiplier={getDynamicMultiplier(service)}
            />
          ))}
        </div>
      )}

      {/* Add to Plan */}
      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => onAddToPlan(vendor)}
          disabled={isInPlan}
          className={cn(
            'w-full py-2 rounded-xl text-sm font-sans font-semibold transition-all duration-200',
            isInPlan
              ? 'bg-[#59ffa0]/10 border border-[#59ffa0]/30 text-[#59ffa0] cursor-default'
              : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 hover:shadow-md hover:shadow-[#59ffa0]/20'
          )}
        >
          {isInPlan ? 'Added ✓' : 'Add to Plan'}
        </button>
      </div>
    </div>
  )
}
