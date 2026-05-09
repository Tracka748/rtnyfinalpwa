'use client'

import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'

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

interface ThemeConfig {
  gradient: string
  emoji: string
  timeLabel: string
  glowColor: string
  shadowColor: string
  shineColor: string
}

const THEME_CONFIG: Record<string, ThemeConfig> = {
  nightlife: {
    gradient:    'from-purple-900/70 to-pink-900/50',
    emoji:       '🌙',
    timeLabel:   'Tonight',
    glowColor:   'rgba(168,85,247,0.12)',
    shadowColor: 'rgba(168,85,247,0.35)',
    shineColor:  'rgba(216,180,254,0.22)',
  },
  brunch: {
    gradient:    'from-orange-900/60 to-yellow-900/50',
    emoji:       '☀️',
    timeLabel:   'This Sunday',
    glowColor:   'rgba(251,146,60,0.12)',
    shadowColor: 'rgba(251,146,60,0.35)',
    shineColor:  'rgba(253,224,71,0.22)',
  },
  date_night: {
    gradient:    'from-rose-900/70 to-purple-900/50',
    emoji:       '💫',
    timeLabel:   'This Evening',
    glowColor:   'rgba(244,63,94,0.12)',
    shadowColor: 'rgba(244,63,94,0.35)',
    shineColor:  'rgba(253,164,175,0.22)',
  },
  family: {
    gradient:    'from-blue-900/60 to-cyan-900/50',
    emoji:       '👨‍👩‍👧',
    timeLabel:   'This Weekend',
    glowColor:   'rgba(59,130,246,0.12)',
    shadowColor: 'rgba(59,130,246,0.35)',
    shineColor:  'rgba(147,197,253,0.22)',
  },
  adventure: {
    gradient:    'from-emerald-900/60 to-teal-900/50',
    emoji:       '🗺️',
    timeLabel:   'Any Morning',
    glowColor:   'rgba(16,185,129,0.12)',
    shadowColor: 'rgba(16,185,129,0.35)',
    shineColor:  'rgba(110,231,183,0.22)',
  },
}

// 6-layer shadow: inset highlight + inset bottom darkening + themed lift + black depth + border ring + outer glow
function buildShadow(cfg: ThemeConfig, mult: number, pressed: boolean, hovered: boolean): string {
  if (pressed) {
    return [
      'inset 0 2px 0 rgba(255,255,255,0.14)',
      'inset 0 -2px 6px rgba(0,0,0,0.45)',
      `0 2px 6px ${cfg.shadowColor}`,
      '0 4px 10px rgba(0,0,0,0.60)',
      '0 0 0 1px rgba(255,255,255,0.08)',
      `0 0 16px -10px ${cfg.glowColor}`,
    ].join(', ')
  }
  const lift = hovered ? mult * 1.25 : mult
  const px = (n: number) => `${Math.round(n * lift)}px`
  return [
    'inset 0 2px 0 rgba(255,255,255,0.22)',
    'inset 0 -2px 6px rgba(0,0,0,0.35)',
    `0 ${px(8)} ${px(20)} ${cfg.shadowColor}`,
    `0 ${px(14)} ${px(30)} rgba(0,0,0,0.70)`,
    '0 0 0 1px rgba(255,255,255,0.12)',
    `0 0 16px -10px ${cfg.glowColor}`,
  ].join(', ')
}

const BTN_SHADOW = [
  'inset 0 1px 0 rgba(255,255,255,0.30)',
  'inset 0 -3px 0 rgba(0,0,0,0.35)',
  '0 6px 16px rgba(0,0,0,0.55)',
  '0 2px 4px rgba(0,0,0,0.65)',
].join(', ')

// Two-layer glass surface: curved-light gradient + concentrated top-edge sheen
function GlassSurface({ shineColor, rounded = 'rounded-t-2xl' }: { shineColor: string; rounded?: string }) {
  return (
    <>
      {/* Convex surface simulation: bright at top, dark at bottom */}
      <div
        className={`absolute inset-0 ${rounded} pointer-events-none`}
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.18) 100%)' }}
      />
      {/* Concentrated gloss band at the very top edge */}
      <div
        className={`absolute inset-x-0 top-0 ${rounded} pointer-events-none`}
        style={{
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 30%, transparent 60%)',
          mixBlendMode: 'overlay',
        }}
      />
    </>
  )
}

function PlanModal({ plan, config, onUseThisPlan, onClose }: {
  plan: CuratedPlan
  config: ThemeConfig
  onUseThisPlan: (plan: CuratedPlan) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1f] rounded-t-2xl md:rounded-2xl w-full md:max-w-lg md:mx-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-3xl shrink-0">{config.emoji}</span>
            <h2 className="font-slab-serif font-bold text-2xl text-foreground leading-tight">{plan.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition text-foreground/60 hover:text-foreground shrink-0 ml-3 mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-5">
          <p className="text-sm text-foreground/60 leading-relaxed">{plan.subtitle}</p>

          <div className="flex items-center gap-4 text-sm text-foreground/50">
            <span>🕐 {plan.estimated_duration_hours}h</span>
            <span>📍 {plan.stops.length} stops</span>
            <span>💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
          </div>

          <div className="space-y-3">
            {plan.stops.map((stop, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-foreground/30 w-16 shrink-0 pt-0.5 tabular-nums">{stop.time}</span>
                <div className="min-w-0">
                  <p className="text-foreground/80 font-medium truncate">{stop.name}</p>
                  <p className="text-foreground/40 text-xs">{stop.category} · ~{stop.duration_minutes}min · ${stop.estimatedCost}</p>
                </div>
              </div>
            ))}
          </div>

          {plan.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/5 text-foreground/40 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          <button
            onClick={() => { onUseThisPlan(plan); onClose() }}
            className="w-full py-3 rounded-xl bg-accent text-background text-sm font-semibold active:scale-[0.97] transition-transform"
            style={{ boxShadow: BTN_SHADOW }}
          >
            Use This Plan →
          </button>
        </div>
      </div>
    </div>
  )
}

export function CuratedPlanCard({ plan, onUseThisPlan, compact = false, mobile = false }: {
  plan: CuratedPlan
  onUseThisPlan: (plan: CuratedPlan) => void
  compact?: boolean
  mobile?: boolean
}) {
  const config = THEME_CONFIG[plan.theme] || THEME_CONFIG.adventure
  const [modalOpen, setModalOpen] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const elevationMultiplier = plan.is_featured ? 1.35 : 1.0
  const shadow = buildShadow(config, elevationMultiplier, pressed, hovered)

  const transform = pressed
    ? 'scale(0.97) translateY(2px)'
    : hovered
    ? 'scale(1.01) translateY(-3px)'
    : 'scale(1) translateY(0)'

  const transition = pressed
    ? 'transform 0.08s ease, box-shadow 0.08s ease'
    : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease'

  const interactionHandlers = {
    onPointerDown:  () => setPressed(true),
    onPointerUp:    () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onMouseEnter:   () => setHovered(true),
    onMouseLeave:   () => setHovered(false),
  }

  if (mobile) {
    return (
      <>
        <div
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${config.gradient} p-2 flex flex-col justify-between h-full cursor-pointer`}
          style={{ boxShadow: shadow, transform, transition }}
          onClick={() => setModalOpen(true)}
          {...interactionHandlers}
        >
          <GlassSurface shineColor={config.shineColor} rounded="rounded-t-xl" />
          <div>
            <div className="flex items-start gap-1 mb-0.5">
              <span className="text-base shrink-0">{config.emoji}</span>
              <h3 className="font-slab-serif font-bold text-xs text-foreground leading-tight line-clamp-2">{plan.title}</h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-foreground/40 mb-1">
              <span>💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
            </div>
            <div className="mb-1">
              {plan.stops.slice(0, 2).map((stop, i) => (
                <div key={i} className="text-[10px] text-foreground/60 truncate">{stop.time} {stop.name}</div>
              ))}
              {plan.stops.length > 2 && (
                <div className="text-[10px] text-accent/70">+{plan.stops.length - 2} more</div>
              )}
            </div>
          </div>
          <span className="text-[#59FFA0] text-xs font-label tracking-wide">View This Plan →</span>
        </div>
        {modalOpen && (
          <PlanModal
            plan={plan}
            config={config}
            onUseThisPlan={onUseThisPlan}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  if (compact) {
    return (
      <>
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-3 flex flex-col justify-between cursor-pointer`}
          style={{ boxShadow: shadow, transform, transition }}
          onClick={() => setModalOpen(true)}
          {...interactionHandlers}
        >
          <GlassSurface shineColor={config.shineColor} />
          {plan.is_flash_deal && (
            <span className="text-[10px] font-label uppercase tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full w-fit animate-pulse mb-1">
              ⚡ Flash Deal
            </span>
          )}
          {plan.is_featured && !plan.is_flash_deal && (
            <span className="text-[10px] font-label uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full w-fit mb-1">
              ⭐ Featured
            </span>
          )}

          <div>
            <div className="flex items-start gap-1.5 mb-1">
              <span className="text-lg shrink-0">{config.emoji}</span>
              <h3 className="font-slab-serif font-bold text-sm text-foreground leading-tight line-clamp-2">
                {plan.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-foreground/40 mb-1">
              <span>💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
            </div>
            <div className="mb-1">
              {plan.stops.slice(0, 2).map((stop, i) => (
                <div key={i} className="text-[10px] text-foreground/60 truncate">{stop.time} {stop.name}</div>
              ))}
              {plan.stops.length > 2 && (
                <div className="text-[10px] text-accent/70">+{plan.stops.length - 2} more</div>
              )}
            </div>
          </div>

          <span className="text-[#59FFA0] text-xs font-label tracking-wide">View This Plan →</span>
        </div>
        {modalOpen && (
          <PlanModal
            plan={plan}
            config={config}
            onUseThisPlan={onUseThisPlan}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-5 flex flex-col gap-3 cursor-pointer`}
        style={{ boxShadow: shadow, transform, transition }}
        onClick={() => setModalOpen(true)}
        {...interactionHandlers}
      >
        <GlassSurface shineColor={config.shineColor} />

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

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{config.emoji}</span>
              <h3 className="font-slab-serif font-bold text-lg text-foreground leading-tight truncate">
                {plan.title}
              </h3>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground/30 shrink-0" />
          </div>
          <p className="text-sm text-foreground/50 mt-1 leading-snug">{plan.subtitle}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-foreground/40">
          <span>🕐 {plan.estimated_duration_hours}h</span>
          <span>📍 {plan.stops.length} stops</span>
          <span>💵 ${plan.estimated_cost_min}–${plan.estimated_cost_max}</span>
        </div>

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

        <div className="flex flex-wrap gap-1.5">
          {plan.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] bg-white/5 text-foreground/40 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <span className="text-[#59FFA0] text-xs font-label tracking-wide">View This Plan →</span>
      </div>
      {modalOpen && (
        <PlanModal
          plan={plan}
          config={config}
          onUseThisPlan={onUseThisPlan}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
