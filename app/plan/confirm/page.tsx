'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'

export const PLAN_STORAGE_KEY = 'rtny_pending_day_plan'

export interface ConfirmStop {
  name: string
  category: string
  icon?: string
  time: string
  address: string
  estimatedSpend: number
  durationMinutes: number
  segment?: 'afternoon' | 'evening' | 'night'
}

export interface PendingDayPlan {
  title: string
  date: string
  badge?: string
  stops: ConfirmStop[]
  totalSpend: number
  totalMins?: number
  preferences?: {
    groupType?: string
    transportation?: string
    energyType?: string
    tags?: string[]
    budget?: string
  }
  source: 'curated' | 'generated'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const SEGMENT_COLORS: Record<string, string> = {
  afternoon: '#f59e0b',
  evening:   '#1ac8ed',
  night:     '#ff6b9d',
}

const BADGE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  NIGHTLIFE: { bg: 'rgba(180,100,255,0.12)', border: 'rgba(180,100,255,0.3)', color: '#C87FFF' },
  FAMILY:    { bg: 'rgba(26,200,237,0.1)',   border: 'rgba(26,200,237,0.3)',  color: '#1AC8ED' },
  ROMANCE:   { bg: 'rgba(255,100,140,0.1)',  border: 'rgba(255,100,140,0.3)', color: '#FF7EB3' },
  CULTURE:   { bg: 'rgba(89,255,160,0.08)',  border: 'rgba(89,255,160,0.25)', color: '#59FFA0' },
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️', bar: '🍸', cafe: '☕', coffee: '☕',
  music: '🎵', art: '🎨', gallery: '🖼️', shopping: '🛍️',
  entertainment: '🎭', outdoor: '🌿', park: '🌿', fitness: '💪',
  spa: '🧘', wellness: '🧘', cinema: '🎬', theater: '🎭',
  lounge: '🛋️', club: '🎉', nightclub: '🎉', venue: '📍',
}

function getCategoryIcon(category: string, icon?: string): string {
  if (icon) return icon
  const lower = category.toLowerCase()
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return emoji
  }
  return '📍'
}

const PREF_ICONS: Record<string, string> = {
  solo: '🙋', couple: '💑', friends: '👥',
  car: '🚗', rideshare: '🚕', walking: '🚶',
  relaxed: '🌊', active: '⚡',
}

// ─── Stop row ─────────────────────────────────────────────────────────────────

function StopRow({ stop, index, isLast }: { stop: ConfirmStop; index: number; isLast: boolean }) {
  const segColor = stop.segment ? SEGMENT_COLORS[stop.segment] : '#59ffa0'

  return (
    <div className="flex gap-3 items-start">
      {/* Left rail */}
      <div className="flex flex-col items-center shrink-0 w-12">
        <div
          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg shrink-0"
          style={{ borderColor: segColor, background: `${segColor}12` }}
        >
          {getCategoryIcon(stop.category, stop.icon)}
        </div>
        {!isLast && (
          <div
            className="w-px mt-1"
            style={{ minHeight: 36, background: `linear-gradient(${segColor}40, #2a2829)` }}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 min-w-0', !isLast && 'pb-4')}>
        <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-label font-semibold text-[13px] tracking-widest" style={{ color: '#F9FDFF' }}>
                STOP {index + 1}
              </span>
              {stop.segment && (
                <span className="font-label text-[9px] tracking-widest text-[#7DD8E8]/30">
                  · {stop.segment.toUpperCase()}
                </span>
              )}
            </div>
            <h4 className="font-header text-sm font-bold text-[#f9fdff] leading-snug">
              {stop.name}
            </h4>
            {stop.address && (
              <p className="flex items-center gap-1 text-[#7DD8E8]/50 text-[10px] mt-0.5 truncate">
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1a3 3 0 0 1 3 3c0 2.5-3 5-3 5S2 6.5 2 4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1" />
                  <circle cx="5" cy="4" r="1" fill="currentColor" />
                </svg>
                {stop.address}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8]">
              🕐 {stop.time}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8]">
              ⏱ {formatMins(stop.durationMinutes)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8] capitalize">
              {stop.category}
            </span>
          </div>

          {/* Price — plain text, right-aligned, bottom of the card content area */}
          <p className="mt-2 text-right font-[family-name:var(--font-playfair)] text-sm font-bold text-[#59ffa0]">
            ${stop.estimatedSpend}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanConfirmPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<PendingDayPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PLAN_STORAGE_KEY)
      if (raw) setPlan(JSON.parse(raw))
    } catch {
      // malformed — show empty state
    }
  }, [])

  async function handleSave() {
    if (!plan) return
    setSaving(true)
    setSaveError(null)

    const supabase = createBrowserSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('day_plans').insert({
      user_id:                user.id,
      plan_date:              plan.date,
      stops:                  plan.stops,
      budget_range:           plan.preferences?.budget ?? null,
      energy_type:            plan.preferences?.energyType ?? null,
      group_type:             plan.preferences?.groupType ?? null,
      tags:                   plan.preferences?.tags ?? [],
      time_start:             null,
      time_end:               null,
      transportation:         plan.preferences?.transportation ?? null,
      total_estimated_spend:  plan.totalSpend,
      total_duration_minutes: plan.totalMins ?? null,
    })

    setSaving(false)
    if (error) {
      setSaveError('Could not save plan. Please try again.')
    } else {
      setSaved(true)
      sessionStorage.removeItem(PLAN_STORAGE_KEY)
    }
  }

  async function handleShare() {
    if (!plan) return
    const text = `My ${plan.title} plan in Rochester, NY — ${plan.stops.length} stops, $${plan.totalSpend} estimated`
    if (navigator.share) {
      await navigator.share({ title: plan.title, text, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(text + '\n' + window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }
  }

  // ── No plan in storage ─────────────────────────────────────────────────────

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#121113] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🗓️</div>
        <h2 className="font-header text-2xl font-bold text-[#f9fdff] mb-2">No plan found</h2>
        <p className="text-[#7DD8E8] font-sans text-sm mb-6 max-w-xs">
          Head back to the planner to generate or select a day plan.
        </p>
        <button
          type="button"
          onClick={() => router.push('/plan')}
          className="px-6 py-2.5 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 transition-colors"
        >
          Go to Planner
        </button>
      </div>
    )
  }

  // ── Saved success screen ───────────────────────────────────────────────────

  if (saved) {
    return (
      <div className="min-h-screen bg-[#121113] flex flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-[#59ffa0]/10 border-2 border-[#59ffa0]/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#59ffa0]" viewBox="0 0 40 40" fill="none">
              <path d="M10 20l7 7 13-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full bg-[#59ffa0]/5 animate-ping" />
        </div>
        <h2 className="font-header text-3xl font-bold text-[#f9fdff] mb-2">Plan Saved!</h2>
        <p className="text-[#7DD8E8] font-sans text-sm mb-8 max-w-xs leading-relaxed">
          Your day plan has been saved to your profile.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/plan')}
            className="px-5 py-2.5 rounded-xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#f9fdff] transition-all"
          >
            Plan Another Day
          </button>
          <a
            href="/"
            className="px-6 py-2.5 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 transition-colors"
          >
            Back to RTNY
          </a>
        </div>
      </div>
    )
  }

  // ── Main confirmation view ─────────────────────────────────────────────────

  const badge = plan.badge ? BADGE_STYLE[plan.badge] ?? BADGE_STYLE.CULTURE : null
  const prefs = plan.preferences

  return (
    <div className="min-h-screen bg-[#121113]">
      <div className="max-w-lg mx-auto px-4 py-8 pb-24">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#7DD8E8] text-sm font-sans mb-6 hover:text-[#f9fdff] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="font-header text-2xl font-bold text-[#f9fdff] leading-tight">
              {plan.title}
            </h1>
            {badge && plan.badge && (
              <span
                className="shrink-0 font-label text-[9px] tracking-widest px-2.5 py-1 rounded-md border"
                style={{ background: badge.bg, borderColor: badge.border, color: badge.color }}
              >
                {plan.badge}
              </span>
            )}
          </div>
          <p className="text-[#1ac8ed] font-sans text-sm">
            📅 {formatDate(plan.date)}
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mb-7">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1819] border border-[#2a2829]">
            <span className="text-[#59ffa0] font-slab-serif font-bold text-sm">
              ${plan.totalSpend.toLocaleString()}
            </span>
            <span className="text-[#7DD8E8] text-xs font-sans">est. total</span>
          </div>
          {plan.totalMins && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1819] border border-[#2a2829]">
              <span className="text-[#1ac8ed] font-slab-serif font-bold text-sm">
                {formatMins(plan.totalMins)}
              </span>
              <span className="text-[#7DD8E8] text-xs font-sans">total time</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a1819] border border-[#2a2829]">
            <span className="text-[#f9fdff] font-slab-serif font-bold text-sm">{plan.stops.length}</span>
            <span className="text-[#7DD8E8] text-xs font-sans">stop{plan.stops.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Preferences row */}
        {prefs && (prefs.groupType || prefs.transportation || prefs.energyType || (prefs.tags && prefs.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mb-7">
            {prefs.groupType && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#2a2829] bg-[#1a1819] text-[#7DD8E8] text-xs font-sans capitalize">
                {PREF_ICONS[prefs.groupType] ?? '👥'} {prefs.groupType}
              </span>
            )}
            {prefs.transportation && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#2a2829] bg-[#1a1819] text-[#7DD8E8] text-xs font-sans capitalize">
                {PREF_ICONS[prefs.transportation] ?? '🚗'} {prefs.transportation}
              </span>
            )}
            {prefs.energyType && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#2a2829] bg-[#1a1819] text-[#7DD8E8] text-xs font-sans capitalize">
                {PREF_ICONS[prefs.energyType] ?? '✨'} {prefs.energyType}
              </span>
            )}
            {prefs.tags?.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full border border-[#1ac8ed]/20 bg-[#1ac8ed]/5 text-[#1ac8ed] text-xs font-sans capitalize">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <span className="font-label text-[10px] tracking-widest text-[#59ffa0]/60">YOUR ITINERARY</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#59ffa0]/15 to-transparent" />
        </div>

        {/* Stops */}
        <div className="mb-8">
          {plan.stops.map((stop, i) => (
            <StopRow
              key={i}
              stop={stop}
              index={i}
              isLast={i === plan.stops.length - 1}
            />
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between px-4 py-4 rounded-2xl border border-[#2a2829] bg-[#1a1819] mb-7">
          <div>
            <p className="font-label text-[9px] tracking-widest text-[#7DD8E8]/40 mb-0.5">ESTIMATED TOTAL</p>
            <p className="font-header text-xl font-bold text-[#59ffa0]">
              ${plan.totalSpend.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-label text-[9px] tracking-widest text-[#7DD8E8]/40 mb-0.5">STOPS</p>
            <p className="font-header text-xl font-bold text-[#f9fdff]">{plan.stops.length}</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          {/* Primary — go to checkout */}
          <button
            type="button"
            onClick={() => router.push('/checkout/day-plan')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#59ffa0] text-[#121113] font-sans font-bold text-sm hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Proceed to Checkout
          </button>

          {/* Secondary — save without paying */}
          {saveError && (
            <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-sans">
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl border font-sans text-sm transition-all duration-200',
              saving
                ? 'border-[#2a2829] text-[#7DD8E8]/30 cursor-not-allowed'
                : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/60 hover:border-[#59ffa0]/30 hover:text-[#f9fdff]'
            )}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z" />
                </svg>
                Saving…
              </>
            ) : (
              'Save Without Paying'
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#1ac8ed]/30 hover:text-[#1ac8ed] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 3.75L5.5 7.25M10.5 12.25L5.5 8.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {linkCopied ? '✓ Copied to Clipboard' : 'Share This Plan'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/plan')}
            className="w-full py-3 rounded-2xl border border-[#2a2829] text-[#f9fdff]/40 font-sans text-sm hover:text-[#f9fdff]/70 hover:border-[#2a2829]/80 transition-all"
          >
            ← Back to Planner
          </button>
        </div>

        <p className="text-center text-xs text-[#7DD8E8]/20 font-sans mt-6 tracking-wider">
          ROCTICKETNY · ROCHESTER, NY
        </p>
      </div>
    </div>
  )
}
