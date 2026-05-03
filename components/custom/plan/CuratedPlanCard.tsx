'use client'

export interface Stop {
  time: string
  name: string
  category: string
  address: string
  estimatedCost: number
  duration_minutes: number
}

export interface CuratedPlan {
  id: string
  title: string
  subtitle: string
  theme: string
  time_of_day: string
  estimated_duration_hours: number
  estimated_cost_min: number
  estimated_cost_max: number
  stops: Stop[]
  tags: string[]
  is_featured: boolean
  is_flash_deal: boolean
  flash_deal_label?: string
  flash_deal_expires_at?: string
}

const THEME_CONFIG: Record<string, { gradient: string, emoji: string, timeLabel: string }> = {
  nightlife:  { gradient: 'from-purple-900/40 to-pink-900/20',   emoji: '🌙', timeLabel: 'Tonight' },
  brunch:     { gradient: 'from-orange-900/30 to-yellow-900/20', emoji: '☀️', timeLabel: 'This Sunday' },
  date_night: { gradient: 'from-rose-900/40 to-purple-900/20',   emoji: '💫', timeLabel: 'This Evening' },
  family:     { gradient: 'from-blue-900/30 to-cyan-900/20',     emoji: '👨‍👩‍👧', timeLabel: 'This Weekend' },
  adventure:  { gradient: 'from-emerald-900/30 to-teal-900/20',  emoji: '🗺️', timeLabel: 'Any Morning' },
}

export function CuratedPlanCard({ plan, onUseThisPlan, compact = false }: {
  plan: CuratedPlan
  onUseThisPlan: (plan: CuratedPlan) => void
  compact?: boolean
}) {
  const config = THEME_CONFIG[plan.theme] || THEME_CONFIG.adventure

  if (compact) {
    return (
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 p-4 flex flex-col gap-2.5 hover:border-white/20 transition-all duration-300 hover:scale-[1.01] cursor-pointer`}
        onClick={() => onUseThisPlan(plan)}
      >
        {/* Badge */}
        {plan.is_flash_deal && (
          <span className="text-[10px] font-label uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full w-fit animate-pulse">
            ⚡ Flash Deal
          </span>
        )}
        {plan.is_featured && !plan.is_flash_deal && (
          <span className="text-[10px] font-label uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full w-fit">
            ⭐ Featured
          </span>
        )}

        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <h3 className="font-slab-serif font-bold text-base text-foreground leading-tight">
            {plan.title}
          </h3>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-foreground/50 line-clamp-1">{plan.subtitle}</p>

        {/* Stat pills */}
        <div className="flex items-center gap-2 text-[10px] text-foreground/40">
          <span className="bg-white/5 px-2 py-0.5 rounded-full">🕐 {plan.estimated_duration_hours}h</span>
          <span className="bg-white/5 px-2 py-0.5 rounded-full">📍 {plan.stops.length} stops</span>
          <span className="bg-white/5 px-2 py-0.5 rounded-full">💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onUseThisPlan(plan) }}
          className="w-full mt-1 py-2 rounded-xl bg-accent text-background text-xs font-semibold hover:opacity-90 transition"
        >
          Use This Plan →
        </button>
      </div>
    )
  }

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 p-5 flex flex-col gap-3 hover:border-white/20 transition-all duration-300 hover:scale-[1.01]`}>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {plan.is_featured && (
          <span className="text-[10px] font-label uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full">
            ⭐ Featured
          </span>
        )}
        {plan.is_flash_deal && (
          <span className="text-[10px] font-label uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
            ⚡ Flash Deal
          </span>
        )}
        <span className="text-[10px] text-foreground/30 ml-auto font-label uppercase tracking-wider">
          {config.timeLabel}
        </span>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span>
          <h3 className="font-slab-serif font-bold text-lg text-foreground leading-tight">
            {plan.title}
          </h3>
        </div>
        <p className="text-sm text-foreground/50 mt-1 leading-snug">{plan.subtitle}</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-foreground/40">
        <span>🕐 {plan.estimated_duration_hours}h</span>
        <span>📍 {plan.stops.length} stops</span>
        <span>💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
      </div>

      {/* Stop preview */}
      <div className="space-y-1.5">
        {plan.stops.slice(0, 3).map((stop, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-foreground/30 w-14 shrink-0">{stop.time}</span>
            <span className="text-foreground/70 truncate">{stop.name}</span>
            <span className="text-foreground/30 shrink-0">{stop.category}</span>
          </div>
        ))}
        {plan.stops.length > 3 && (
          <p className="text-xs text-foreground/30 pl-16">
            +{plan.stops.length - 3} more stops
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {plan.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-[10px] bg-white/5 text-foreground/40 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onUseThisPlan(plan)}
        className="w-full mt-1 py-2.5 rounded-xl bg-accent text-background text-sm font-semibold hover:opacity-90 transition"
      >
        Use This Plan →
      </button>
    </div>
  )
}
