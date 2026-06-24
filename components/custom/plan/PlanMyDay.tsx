'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveOffer {
  id: string
  title: string
  description: string | null
  offer_type: string | null
  discount_amount: number | null
  discount_percent: number | null
}

interface TimelineStop {
  business_id: string
  name: string
  category: string
  address: string | null
  estimated_arrival: string
  duration_minutes: number
  estimated_spend: number
  offer: ActiveOffer | null
}

interface SegmentSummary {
  label: SegmentLabel
  window_start: string
  window_end: string
  stop_count: number
}

interface DayPlanResult {
  timeline: TimelineStop[]
  total_estimated_spend: number
  total_duration_minutes: number
  segments: SegmentSummary[]
}

type SegmentLabel = 'afternoon' | 'evening' | 'night'

interface EnrichedStop {
  stop: TimelineStop
  segment: SegmentLabel
  locked: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  { label: 'Under $50',   apiValue: 50   },
  { label: '$50–$100',    apiValue: 100  },
  { label: '$100–$200',   apiValue: 200  },
  { label: '$200+',       apiValue: null }, // no budget cap
]

const TAGS = [
  { value: 'solo',          icon: '🙋' },
  { value: 'casual',        icon: '😌' },
  { value: 'comfort',       icon: '🛋️' },
  { value: 'recharge',      icon: '🔋' },
  { value: 'social',        icon: '🥂' },
  { value: 'explore',       icon: '🗺️' },
  { value: 'entertainment', icon: '🎭' },
  { value: 'night',         icon: '🌙' },
  { value: 'shopping',      icon: '🛍️' },
  { value: 'food',          icon: '🍽️' },
  { value: 'self-care',     icon: '🌸' },
]

const ENERGY_OPTIONS = [
  { value: 'relaxed',    label: 'Relaxed',    icon: '🌊' },
  { value: 'active',     label: 'Active',     icon: '⚡' },
  { value: 'family_fun', label: 'Family Fun', icon: '🎠' },
]

const GROUP_OPTIONS = [
  { value: 'solo',    label: 'Solo',          icon: '🙋' },
  { value: 'couple',  label: 'Couple',        icon: '💑' },
  { value: 'friends', label: 'Friends',       icon: '👥' },
  { value: 'family',  label: 'Parent/Family', icon: '👨‍👩‍👧' },
  { value: 'pet',     label: 'Pet Owner',     icon: '🐾' },
]

const TRANSPORT_OPTIONS = [
  { value: 'car',       label: 'Driving',    icon: '🚗' },
  { value: 'rideshare', label: 'Rideshare',  icon: '🚕' },
  { value: 'walking',   label: 'Walking',    icon: '🚶' },
]

// ─── Group-based tag suggestions ──────────────────────────────────────────────

interface UserGroup {
  id: string
  name: string
  slug: string | null
  category: string | null
}

interface GroupSuggestion {
  /** The 1–2 matched groups shown in the strip */
  groups: UserGroup[]
  /** Deduped, valid, max-3 tags derived from those groups */
  tags: string[]
}

const GROUP_TAG_MAP: Array<{ keywords: string[]; tags: string[] }> = [
  { keywords: ['music', 'hip hop', 'hip-hop', 'concert'], tags: ['night', 'entertainment', 'social'] },
  { keywords: ['food', 'dining'],                          tags: ['food', 'social', 'casual']         },
  { keywords: ['fitness', 'active'],                       tags: ['active', 'explore']                },
  { keywords: ['art', 'culture'],                          tags: ['entertainment', 'explore']         },
]

// Pre-computed set of valid tag values for fast filtering
const VALID_TAG_VALUES = new Set(TAGS.map(t => t.value))

function computeSuggestions(groups: UserGroup[]): GroupSuggestion | null {
  const matchedGroups: UserGroup[] = []
  const tagSet = new Set<string>()

  for (const group of groups) {
    // Search both group name and category for keyword matches
    const haystack = `${group.name} ${group.category ?? ''}`.toLowerCase()
    let matched = false

    for (const rule of GROUP_TAG_MAP) {
      if (rule.keywords.some(kw => haystack.includes(kw))) {
        matched = true
        for (const tag of rule.tags) {
          if (VALID_TAG_VALUES.has(tag) && tagSet.size < 3) tagSet.add(tag)
        }
      }
    }
    if (matched) matchedGroups.push(group)
  }

  if (matchedGroups.length === 0 || tagSet.size === 0) return null

  return {
    groups: matchedGroups.slice(0, 2),
    tags:   [...tagSet],
  }
}

const SEGMENT_CONFIG: Record<SegmentLabel, { label: string; icon: string; color: string }> = {
  afternoon: { label: 'Afternoon', icon: '☀️',  color: '#f59e0b' },
  evening:   { label: 'Evening',   icon: '🌆',  color: '#1ac8ed' },
  night:     { label: 'Night',     icon: '🌙',  color: '#ff6b9d' },
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant:    '🍽️',
  bar:           '🍸',
  cafe:          '☕',
  coffee:        '☕',
  music:         '🎵',
  art:           '🎨',
  gallery:       '🖼️',
  shopping:      '🛍️',
  entertainment: '🎭',
  outdoor:       '🌿',
  park:          '🌿',
  fitness:       '💪',
  gym:           '💪',
  spa:           '🧘',
  wellness:      '🧘',
  cinema:        '🎬',
  theater:       '🎭',
  lounge:        '🛋️',
  club:          '🎉',
  nightclub:     '🎉',
  bowling:       '🎳',
  arcade:        '🎮',
  escape:        '🔐',
}

// ─── Curated plan preload helpers ─────────────────────────────────────────────

export interface PreloadedStop {
  time: string
  name: string
  category: string
  address: string
  estimatedCost: number
  duration_minutes: number
}

function parseTimeTo24h(timeStr: string): string {
  const parts = timeStr.trim().split(' ')
  const [h, m] = parts[0].split(':').map(Number)
  const ampm = parts[1]?.toUpperCase()
  let hours = h
  if (ampm === 'PM' && h !== 12) hours += 12
  if (ampm === 'AM' && h === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

function segmentFromTime(timeStr: string): SegmentLabel {
  const [h] = parseTimeTo24h(timeStr).split(':').map(Number)
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function preloadedToEnriched(stops: PreloadedStop[]): EnrichedStop[] {
  return stops.map((stop, i) => ({
    stop: {
      business_id: `curated-${i}-${stop.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: stop.name,
      category: stop.category,
      address: stop.address,
      estimated_arrival: parseTimeTo24h(stop.time),
      duration_minutes: stop.duration_minutes,
      estimated_spend: stop.estimatedCost,
      offer: null,
    },
    segment: segmentFromTime(stop.time),
    locked: false,
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISOLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DayPill {
  date: string       // YYYY-MM-DD
  dayLabel: string   // 'Today' | 'Mon' | 'Tue' …
  monthDay: string   // 'Apr 17'
}

function getDayPills(): DayPill[] {
  const base = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return {
      date:     toISOLocal(d),
      dayLabel: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })
}

function getCategoryIcon(category: string): string {
  const lower = category.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '📍'
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function buildEnrichedStops(result: DayPlanResult): EnrichedStop[] {
  const enriched: EnrichedStop[] = []
  let idx = 0
  for (const seg of result.segments) {
    for (let i = 0; i < seg.stop_count; i++) {
      if (result.timeline[idx]) {
        enriched.push({ stop: result.timeline[idx], segment: seg.label, locked: false })
        idx++
      }
    }
  }
  return enriched
}

function mergeWithLocked(fresh: EnrichedStop[], locked: EnrichedStop[]): EnrichedStop[] {
  const result: EnrichedStop[] = []
  const segmentOrder: SegmentLabel[] = ['afternoon', 'evening', 'night']

  for (const seg of segmentOrder) {
    const lockedInSeg = locked.filter(s => s.segment === seg)
    const lockedIds   = new Set(lockedInSeg.map(s => s.stop.business_id))
    const freshInSeg  = fresh.filter(s => s.segment === seg && !lockedIds.has(s.stop.business_id))
    const slots       = Math.max(0, 3 - lockedInSeg.length)

    result.push(...lockedInSeg.map(s => ({ ...s, locked: true })))
    result.push(...freshInSeg.slice(0, slots).map(s => ({ ...s, locked: false })))
  }

  return result.sort((a, b) =>
    a.stop.estimated_arrival.localeCompare(b.stop.estimated_arrival)
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  timeStart:     string
  timeEnd:       string
  budget:        string   // one of BUDGET_OPTIONS labels
  energyType:    string
  tags:          string[]
  groupType:     string[]
  transportation:string
}

const DEFAULT_FORM: FormState = {
  timeStart:     '12:00',
  timeEnd:       '23:00',
  budget:        '',
  energyType:    '',
  tags:          [],
  groupType:     [],
  transportation:'car',
}

function buildParams(form: FormState, planDate: string): URLSearchParams {
  const params = new URLSearchParams()
  params.set('plan_date',  planDate)
  params.set('time_start', form.timeStart)
  params.set('time_end',   form.timeEnd)
  const budgetOpt = BUDGET_OPTIONS.find(b => b.label === form.budget)
  if (budgetOpt?.apiValue != null) params.set('budget', String(budgetOpt.apiValue))
  if (form.energyType) params.set('energy_type', form.energyType)
  if (form.tags.length) params.set('tags', form.tags.join(','))
  if (form.groupType.length) params.set('group_type', form.groupType.join(','))
  params.set('transportation', form.transportation)
  return params
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DaySelectorProps {
  pills: DayPill[]
  selected: string
  onChange: (date: string) => void
}

function DaySelector({ pills, selected, onChange }: DaySelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
      {pills.map(pill => {
        const active = pill.date === selected
        return (
          <button
            key={pill.date}
            type="button"
            onClick={() => onChange(pill.date)}
            className={cn(
              'flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-full border text-center transition-all duration-150',
              active
                ? 'border-[#1ac8ed] bg-[#1ac8ed]/10 text-[#1ac8ed]'
                : 'border-[#2a2829] bg-[#1a1819] text-[#7DD8E8]/60 hover:border-[#1ac8ed]/40 hover:text-[#7DD8E8]'
            )}
          >
            <span className="font-label text-[10px] tracking-widest leading-none">
              {pill.dayLabel.toUpperCase()}
            </span>
            <span className="font-sans text-[11px] leading-none mt-0.5 whitespace-nowrap">
              {pill.monthDay}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-label text-[10px] tracking-widest text-[#7DD8E8] mb-2.5">
      {children}
    </label>
  )
}

// ─── Group suggestion strip ───────────────────────────────────────────────────

interface GroupSuggestionStripProps {
  suggestion: GroupSuggestion
  currentTags: string[]
  onApply: (tags: string[]) => void
}

function GroupSuggestionStrip({ suggestion, currentTags, onApply }: GroupSuggestionStripProps) {
  const [applied, setApplied] = useState(false)

  // Already applied if every suggested tag is present in current selection
  const alreadyApplied = suggestion.tags.every(t => currentTags.includes(t))

  function handleApply() {
    onApply(suggestion.tags)
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-2.5 px-3 py-2.5 rounded-xl bg-[#1ac8ed]/5 border border-[#1ac8ed]/10">
      {/* Spark icon + label */}
      <span className="font-sans text-[10px] text-[#7DD8E8]/55 shrink-0 flex items-center gap-1">
        <svg className="w-2.5 h-2.5 shrink-0 text-[#1ac8ed]/60" viewBox="0 0 10 10" fill="none">
          <path d="M5 1l1 3h3L6.5 6l1 3L5 7.5 2.5 9l1-3L1 4h3L5 1z" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.25" />
        </svg>
        Based on your groups:
      </span>

      {/* Group name pills */}
      <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
        {suggestion.groups.map(g => (
          <span
            key={g.id}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#f9fdff]/65 font-sans text-[10px] truncate max-w-[120px]"
          >
            {g.name}
          </span>
        ))}
      </div>

      {/* Apply button */}
      <button
        type="button"
        onClick={handleApply}
        disabled={alreadyApplied}
        className={cn(
          'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border font-sans text-[11px] transition-all duration-150',
          applied || alreadyApplied
            ? 'border-[#59ffa0]/30 bg-[#59ffa0]/8 text-[#59ffa0] cursor-default'
            : 'border-[#1ac8ed]/30 text-[#1ac8ed] hover:bg-[#1ac8ed]/10 active:scale-[0.97]'
        )}
      >
        {applied || alreadyApplied ? (
          <>
            <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Applied
          </>
        ) : (
          'Apply suggestions'
        )}
      </button>
    </div>
  )
}

function OfferBadge({ offer }: { offer: ActiveOffer }) {
  const discount = offer.discount_percent
    ? `${offer.discount_percent}% off`
    : offer.discount_amount
    ? `$${offer.discount_amount} off`
    : offer.offer_type ?? null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff6b9d]/10 border border-[#ff6b9d]/25 text-[#ff6b9d] text-[10px] font-sans">
      🏷️ {offer.title}{discount ? ` · ${discount}` : ''}
    </span>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3 mt-2 animate-pulse">
      {[80, 64, 72].map((h, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex flex-col items-center pt-1 shrink-0 w-12">
            <div className="w-9 h-9 rounded-full bg-[#242324]" />
            {i < 2 && <div className="w-px bg-[#2a2829] mt-1" style={{ height: h }} />}
          </div>
          <div className="flex-1 rounded-2xl border border-[#2a2829] bg-[#1a1819] p-4 space-y-2.5">
            <div className="h-3.5 bg-[#242324] rounded-full w-1/2" />
            <div className="h-2.5 bg-[#242324] rounded-full w-1/3" />
            <div className="h-2.5 bg-[#242324] rounded-full w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stop card ────────────────────────────────────────────────────────────────

interface StopCardProps {
  enriched: EnrichedStop
  index: number
  isLast: boolean
  swapping: boolean
  onLock: () => void
  onSwap: () => void
  showSegHeader: boolean
}

function StopCard({ enriched, isLast, swapping, onLock, onSwap, showSegHeader }: StopCardProps) {
  const { stop, segment, locked } = enriched
  const seg = SEGMENT_CONFIG[segment]

  return (
    <div>
      {/* Segment header */}
      {showSegHeader && (
        <div className="flex items-center gap-2 mb-3 mt-1">
          <span className="text-sm">{seg.icon}</span>
          <span className="font-label text-[10px] tracking-widest" style={{ color: seg.color }}>
            {seg.label.toUpperCase()}
          </span>
          <div className="flex-1 h-px" style={{ background: `${seg.color}28` }} />
        </div>
      )}

      <div className="flex gap-3 items-start">
        {/* Left rail */}
        <div className="flex flex-col items-center shrink-0 w-12">
          {/* Time bubble */}
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0"
            style={{
              borderColor: locked ? '#59ffa0' : seg.color,
              background:  locked ? 'rgba(89,255,160,0.12)' : `${seg.color}14`,
              color:        locked ? '#59ffa0' : seg.color,
            }}
          >
            <span className="text-[9px] font-bold leading-none text-center">
              {formatTime(stop.estimated_arrival).replace(' AM','').replace(' PM','')}
              <br />
              <span className="text-[8px] opacity-60">
                {formatTime(stop.estimated_arrival).slice(-2)}
              </span>
            </span>
          </div>
          {/* Connector */}
          {!isLast && (
            <div
              className="w-px flex-1 mt-1"
              style={{
                minHeight: 40,
                background: `linear-gradient(${seg.color}30, #2a2829)`,
              }}
            />
          )}
        </div>

        {/* Card */}
        <div className={cn('flex-1 min-w-0', !isLast && 'pb-3')}>
          <div
            className={cn(
              'rounded-2xl border bg-[#1a1819] p-4 transition-all duration-200',
              locked ? 'border-[#59ffa0]/30' : 'border-[#2a2829] hover:border-[#2a2829]/70'
            )}
          >
            <div className="flex items-start gap-4">
              {/* Category icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${seg.color}10` }}
              >
                {getCategoryIcon(stop.category)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-header text-sm font-bold text-[#f9fdff] leading-snug truncate">
                      {stop.name}
                    </h4>
                    <p className="text-[#7DD8E8] text-[11px] capitalize mt-0.5">{stop.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#59ffa0] font-slab-serif font-bold text-sm">
                      ${stop.estimated_spend.toLocaleString()}
                    </p>
                    <p className="text-[#7DD8E8]/50 text-[10px]">
                      {formatMins(stop.duration_minutes)}
                    </p>
                  </div>
                </div>

                {stop.address && (
                  <p className="flex items-center gap-1 text-[#7DD8E8]/50 text-[10px] mt-1.5 truncate">
                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1a3 3 0 0 1 3 3c0 2.5-3 5-3 5S2 6.5 2 4a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1" />
                      <circle cx="5" cy="4" r="1" fill="currentColor" />
                    </svg>
                    {stop.address}
                  </p>
                )}

                {/* Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8]">
                    🕐 {formatTime(stop.estimated_arrival)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242324] border border-[#2a2829] text-[#7DD8E8]">
                    ⏱ {formatMins(stop.duration_minutes)}
                  </span>
                  {stop.offer && <OfferBadge offer={stop.offer} />}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[#2a2829]">
              {/* Swap */}
              <button
                type="button"
                onClick={onSwap}
                disabled={swapping || locked}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-sans transition-all duration-150',
                  locked
                    ? 'border-[#2a2829] text-[#7DD8E8]/25 cursor-not-allowed'
                    : swapping
                    ? 'border-[#1ac8ed]/30 bg-[#1ac8ed]/5 text-[#1ac8ed]'
                    : 'border-[#2a2829] text-[#7DD8E8] hover:border-[#1ac8ed]/40 hover:text-[#1ac8ed] hover:bg-[#1ac8ed]/5'
                )}
              >
                {swapping ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none">
                    <circle className="opacity-25" cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M2 6a4 4 0 014-4v2l1.5-1.5L6 1v2A4 4 0 012 6z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M1 3.5h8M7 1.5l2 2-2 2M11 8.5H3M5 6.5l-2 2 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                Swap
              </button>

              {/* Lock toggle */}
              <button
                type="button"
                onClick={onLock}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-sans transition-all duration-150',
                  locked
                    ? 'border-[#59ffa0]/40 bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] text-[#7DD8E8] hover:border-[#59ffa0]/40 hover:text-[#59ffa0] hover:bg-[#59ffa0]/5'
                )}
              >
                {locked ? (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    Locked
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4 5V3.5a2 2 0 014 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    Lock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Input panel ──────────────────────────────────────────────────────────────

interface InputPanelProps {
  form: FormState
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  onGenerate: () => void
  loading: boolean
  groupSuggestion: GroupSuggestion | null
}

function InputPanel({ form, set, onGenerate, loading, groupSuggestion }: InputPanelProps) {
  const inputBase =
    'w-full bg-[#121113] border border-[#2a2829] rounded-xl px-4 py-2.5 text-[#f9fdff] font-sans text-sm ' +
    'placeholder:text-[#7DD8E8]/40 outline-none transition-all duration-200 ' +
    'focus:border-[#59ffa0] focus:ring-2 focus:ring-[#59ffa0]/20'

  function toggleTag(tag: string) {
    const current = form.tags
    if (current.includes(tag)) {
      set('tags', current.filter(t => t !== tag))
    } else if (current.length < 3) {
      set('tags', [...current, tag])
    }
  }

  return (
    <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] divide-y divide-[#2a2829]">
      {/* Time */}
      <div className="p-4 md:p-5">
        <FieldLabel>Time Range</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[#7DD8E8]/50 text-[10px] mb-1 font-sans">From</p>
            <input type="time" value={form.timeStart} title="Start time"
              onChange={e => set('timeStart', e.target.value)}
              className={inputBase} style={{ colorScheme: 'dark' }} />
          </div>
          <div>
            <p className="text-[#7DD8E8]/50 text-[10px] mb-1 font-sans">Until</p>
            <input type="time" value={form.timeEnd} title="End time"
              onChange={e => set('timeEnd', e.target.value)}
              className={inputBase} style={{ colorScheme: 'dark' }} />
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="p-4 md:p-5">
        <FieldLabel>Budget per person</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BUDGET_OPTIONS.map(opt => {
            const active = form.budget === opt.label
            return (
              <button key={opt.label} type="button"
                onClick={() => set('budget', active ? '' : opt.label)}
                className={cn(
                  'py-2 px-3 rounded-xl border text-xs font-sans font-medium text-center transition-all duration-150',
                  active
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/70 hover:border-[#59ffa0]/30'
                )}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vibe */}
      <div className="p-4 md:p-5">
        <FieldLabel>Vibe</FieldLabel>
        <div className="flex gap-2">
          {ENERGY_OPTIONS.map(opt => {
            const active = form.energyType === opt.value
            return (
              <button key={opt.value} type="button"
                onClick={() => set('energyType', active ? '' : opt.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-sans font-medium transition-all duration-150',
                  active
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/70 hover:border-[#59ffa0]/30'
                )}>
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tags — max 3 */}
      <div className="p-4 md:p-5">
        {/* Group-based suggestions — only shown when user has matching groups */}
        {groupSuggestion && (
          <GroupSuggestionStrip
            suggestion={groupSuggestion}
            currentTags={form.tags}
            onApply={tags => set('tags', tags)}
          />
        )}

        <div className="flex items-center justify-between mb-2.5">
          <FieldLabel>Mood Tags</FieldLabel>
          <span className="text-[10px] text-[#7DD8E8]/50 font-sans">
            {form.tags.length}/3 selected
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map(tag => {
            const active  = form.tags.includes(tag.value)
            const maxed   = !active && form.tags.length >= 3
            return (
              <button key={tag.value} type="button"
                onClick={() => toggleTag(tag.value)}
                disabled={maxed}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-sans capitalize transition-all duration-150',
                  active
                    ? 'border-[#1ac8ed] bg-[#1ac8ed]/10 text-[#1ac8ed]'
                    : maxed
                    ? 'border-[#2a2829] bg-[#121113] text-[#7DD8E8]/25 cursor-not-allowed'
                    : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/70 hover:border-[#1ac8ed]/30 hover:text-[#1ac8ed]'
                )}>
                <span>{tag.icon}</span>
                {tag.value}
              </button>
            )
          })}
        </div>
      </div>

      {/* Group type — multi-select */}
      <div className="p-4 md:p-5">
        <FieldLabel>Going as</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {GROUP_OPTIONS.map(opt => {
            const active = form.groupType.includes(opt.value)
            return (
              <button key={opt.value} type="button"
                onClick={() => {
                  const current = form.groupType
                  set('groupType', active ? current.filter(v => v !== opt.value) : [...current, opt.value])
                }}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-sans transition-all duration-150',
                  active
                    ? 'border-[#ff6b9d] bg-[#ff6b9d]/10 text-[#ff6b9d]'
                    : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/70 hover:border-[#ff6b9d]/30'
                )}>
                <span className="text-lg">{opt.icon}</span>
                <span className="font-medium text-center leading-tight">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transportation */}
      <div className="p-4 md:p-5">
        <FieldLabel>Getting Around</FieldLabel>
        <div className="flex gap-2">
          {TRANSPORT_OPTIONS.map(opt => {
            const active = form.transportation === opt.value
            return (
              <button key={opt.value} type="button"
                onClick={() => set('transportation', opt.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-sans transition-all duration-150',
                  active
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/70 hover:border-[#59ffa0]/30'
                )}>
                <span className="text-lg">{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Generate button */}
      <div className="p-4 md:p-5">
        <button type="button" onClick={onGenerate} disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-sans font-bold text-sm transition-all duration-200',
            loading
              ? 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
              : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20 active:scale-[0.98]'
          )}>
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z" />
              </svg>
              Building your day…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Generate My Day
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Route summary ────────────────────────────────────────────────────────────

function RouteSummary({
  stops,
  totalSpend,
  totalMins,
}: {
  stops: number
  totalSpend: number
  totalMins: number
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1819] border border-[#2a2829]">
        <span className="text-[#59ffa0] font-slab-serif font-bold text-base">
          ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="text-[#7DD8E8] text-xs font-sans">est. spend</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1819] border border-[#2a2829]">
        <span className="text-[#1ac8ed] font-slab-serif font-bold text-base">
          {formatMins(totalMins)}
        </span>
        <span className="text-[#7DD8E8] text-xs font-sans">total time</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1819] border border-[#2a2829]">
        <span className="text-[#f9fdff] font-slab-serif font-bold text-base">{stops}</span>
        <span className="text-[#7DD8E8] text-xs font-sans">stop{stops !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ─── Regenerate controls ──────────────────────────────────────────────────────

function RegenerateControls({
  lockedCount,
  loading,
  onRegenerateAll,
  onRegenerateUnlocked,
}: {
  lockedCount: number
  loading: boolean
  onRegenerateAll: () => void
  onRegenerateUnlocked: () => void
}) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <button type="button" onClick={onRegenerateAll} disabled={loading}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-sans font-medium transition-all duration-150',
          loading
            ? 'border-[#2a2829] text-[#7DD8E8]/30 cursor-not-allowed'
            : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#59ffa0]/30 hover:text-[#59ffa0]'
        )}>
        <svg className={cn('w-3 h-3', loading && 'animate-spin')} viewBox="0 0 12 12" fill="none">
          <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5V3l1.5-1.5L6 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Regenerate All
      </button>

      <button type="button" onClick={onRegenerateUnlocked} disabled={loading || lockedCount === 0}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-sans font-medium transition-all duration-150',
          loading || lockedCount === 0
            ? 'border-[#2a2829] text-[#7DD8E8]/30 cursor-not-allowed'
            : 'border-[#59ffa0]/30 bg-[#59ffa0]/5 text-[#59ffa0] hover:bg-[#59ffa0]/10'
        )}>
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.1" />
          <path d="M4 5.5V4a2 2 0 014 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M9 3.5A4 4 0 1 1 4 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        Regenerate Unlocked
        {lockedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#59ffa0]/20 text-[#59ffa0] text-[9px] font-bold">
            {lockedCount} locked
          </span>
        )}
      </button>
    </div>
  )
}

// ─── Timeline view ────────────────────────────────────────────────────────────

interface TimelineViewProps {
  enrichedStops: EnrichedStop[]
  swappingIdx: number | null
  onLock: (idx: number) => void
  onSwap: (idx: number) => void
}

function TimelineView({ enrichedStops, swappingIdx, onLock, onSwap }: TimelineViewProps) {
  if (enrichedStops.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-[#2a2829] bg-[#1a1819]">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-[#7DD8E8] font-sans text-sm max-w-xs mx-auto leading-relaxed">
          No businesses matched your criteria for today.
          <br />Try widening your time range or adjusting your filters.
        </p>
      </div>
    )
  }

  return (
    <div>
      {enrichedStops.map((enriched, i) => {
        const showSegHeader =
          i === 0 || enriched.segment !== enrichedStops[i - 1].segment
        return (
          <StopCard
            key={enriched.stop.business_id + i}
            enriched={enriched}
            index={i}
            isLast={i === enrichedStops.length - 1}
            swapping={swappingIdx === i}
            onLock={() => onLock(i)}
            onSwap={() => onSwap(i)}
            showSegHeader={showSegHeader}
          />
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanMyDay({ preloadedStops }: { preloadedStops?: PreloadedStop[] } = {}) {
  const initEnriched = preloadedStops && preloadedStops.length > 0
    ? preloadedToEnriched(preloadedStops)
    : []

  const [form, setFormState] = useState<FormState>(DEFAULT_FORM)
  const [selectedDate, setSelectedDate] = useState<string>(() => toISOLocal(new Date()))
  const [enrichedStops, setEnrichedStops] = useState<EnrichedStop[]>(initEnriched)
  const [totalSpend, setTotalSpend]       = useState(() => initEnriched.reduce((s, e) => s + e.stop.estimated_spend, 0))
  const [totalMins,  setTotalMins]        = useState(() => initEnriched.reduce((s, e) => s + e.stop.duration_minutes, 0))
  const [loading,    setLoading]          = useState(false)
  const [regenLoading, setRegenLoading]   = useState(false)
  const [swappingIdx,  setSwappingIdx]    = useState<number | null>(null)
  const [error,      setError]            = useState<string | null>(null)
  const [hasResult,  setHasResult]        = useState(initEnriched.length > 0)
  const [groupSuggestion, setGroupSuggestion] = useState<GroupSuggestion | null>(null)

  const router   = useRouter()
  const dayPills = getDayPills()

  // ── Fetch user's group memberships on mount for tag suggestions ────────────
  useEffect(() => {
    async function loadGroupSuggestions() {
      try {
        const res = await fetch('/api/v1/users/me/groups')
        // 401 = not authenticated; any error = hide section silently
        if (!res.ok) return
        const json = await res.json()
        if (json.success && Array.isArray(json.data?.groups) && json.data.groups.length > 0) {
          setGroupSuggestion(computeSuggestions(json.data.groups))
        }
      } catch {
        // Network error — fail silently, feature just won't appear
      }
    }
    loadGroupSuggestions()
  }, [])

  // Field setter (stable reference)
  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setFormState(f => ({ ...f, [k]: v }))
  }, [])

  // Capture form in ref for use inside callbacks without stale closure
  const currentForm = form

  // Core fetch function — returns enriched stops on success
  async function fetchPlan(f: FormState): Promise<EnrichedStop[] | null> {
    const params = buildParams(f, selectedDate)
    console.log('[PlanMyDay] fetchPlan payload:', { groupType: f.groupType, energyType: f.energyType, queryString: params.toString() })
    const res = await fetch(`/api/v1/plan/day?${params.toString()}`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error ?? 'Failed to generate day plan')
    }
    const json: { success: boolean; data: DayPlanResult } = await res.json()
    const { total_estimated_spend, total_duration_minutes } = json.data
    setTotalSpend(total_estimated_spend)
    setTotalMins(total_duration_minutes)
    return buildEnrichedStops(json.data)
  }

  // Generate (full, resets locks)
  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setHasResult(false)
    try {
      const stops = await fetchPlan(currentForm)
      if (stops) {
        setEnrichedStops(stops)
        setHasResult(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Regenerate all (same as generate, no lock preservation)
  async function handleRegenerateAll() {
    setRegenLoading(true)
    setError(null)
    try {
      const stops = await fetchPlan(currentForm)
      if (stops) setEnrichedStops(stops)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setRegenLoading(false)
    }
  }

  // Regenerate unlocked — preserve locked stops, fill rest from fresh fetch
  async function handleRegenerateUnlocked() {
    const locked = enrichedStops.filter(s => s.locked)
    if (locked.length === 0) return handleRegenerateAll()

    setRegenLoading(true)
    setError(null)
    try {
      const freshStops = await fetchPlan(currentForm)
      if (freshStops) {
        setEnrichedStops(mergeWithLocked(freshStops, locked))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setRegenLoading(false)
    }
  }

  // Swap a single stop with a fresh alternative from the same segment
  async function handleSwap(idx: number) {
    const target = enrichedStops[idx]
    if (target.locked) return

    setSwappingIdx(idx)
    try {
      const freshStops = await fetchPlan(currentForm)
      if (!freshStops) return

      const currentIds = new Set(enrichedStops.map(s => s.stop.business_id))
      const alt = freshStops.find(
        s => s.segment === target.segment && !currentIds.has(s.stop.business_id)
      )

      if (alt) {
        setEnrichedStops(prev => {
          const next = [...prev]
          next[idx] = { ...alt, locked: false }
          return next
        })
      }
      // If no alternative found, leave the stop unchanged (silent — no error)
    } catch {
      // Swap is best-effort; don't surface errors to avoid disrupting the UI
    } finally {
      setSwappingIdx(null)
    }
  }

  const [saved, setSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function handleConfirmPlan() {
    const fmt = (t: string): string => {
      const [h, m] = t.split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
    }
    const plan = {
      title: 'My Day Plan',
      date: selectedDate,
      stops: enrichedStops.map(e => ({
        name: e.stop.name,
        category: e.stop.category,
        time: fmt(e.stop.estimated_arrival),
        address: e.stop.address ?? '',
        estimatedSpend: e.stop.estimated_spend,
        durationMinutes: e.stop.duration_minutes,
        segment: e.segment,
      })),
      totalSpend,
      totalMins,
      source: 'generated' as const,
      preferences: {
        groupType:      form.groupType,
        transportation: form.transportation,
        energyType:     form.energyType,
        tags:           form.tags,
        budget:         form.budget,
      },
    }
    sessionStorage.setItem('rtny_pending_day_plan', JSON.stringify(plan))
    router.push('/plan/confirm')
  }

  async function handleSaveDayPlan() {
    const supabase = createBrowserSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('day_plans')
      .insert({
        user_id:                user.id,
        plan_date:              selectedDate,
        stops:                  enrichedStops,
        budget_range:           form.budget,
        energy_type:            form.energyType,
        group_type:             form.groupType,
        tags:                   form.tags,
        time_start:             form.timeStart,
        time_end:               form.timeEnd,
        transportation:         form.transportation,
        total_estimated_spend:  totalSpend,
        total_duration_minutes: totalMins,
      })

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'My RTNY Day Plan', url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }
  }

  function toggleLock(idx: number) {
    setEnrichedStops(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], locked: !next[idx].locked }
      return next
    })
  }

  const lockedCount = enrichedStops.filter(s => s.locked).length

  return (
    <div className="max-w-2xl mx-auto">
      {/* Day selector */}
      <DaySelector pills={dayPills} selected={selectedDate} onChange={setSelectedDate} />

      {/* Input panel */}
      <InputPanel
        form={form}
        set={set}
        onGenerate={handleGenerate}
        loading={loading}
        groupSuggestion={groupSuggestion}
      />

      {/* Results area */}
      {loading && (
        <div className="mt-6">
          <div className="flex gap-2 mb-4">
            {[48, 56, 40].map((w, i) => (
              <div key={i} className="h-12 rounded-xl bg-[#1a1819] border border-[#2a2829] animate-pulse" style={{ width: w * 2 }} />
            ))}
          </div>
          <TimelineSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="mt-5 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-sans">
          {error}
        </div>
      )}

      {!loading && hasResult && (
        <div className="mt-6">
          {/* Summary */}
          <RouteSummary
            stops={enrichedStops.length}
            totalSpend={totalSpend}
            totalMins={totalMins}
          />

          {/* Regen controls */}
          <RegenerateControls
            lockedCount={lockedCount}
            loading={regenLoading}
            onRegenerateAll={handleRegenerateAll}
            onRegenerateUnlocked={handleRegenerateUnlocked}
          />

          {/* Timeline */}
          {regenLoading ? (
            <TimelineSkeleton />
          ) : (
            <TimelineView
              enrichedStops={enrichedStops}
              swappingIdx={swappingIdx}
              onLock={toggleLock}
              onSwap={handleSwap}
            />
          )}

          {/* Plan My Day CTA Footer */}
          {enrichedStops.length > 0 && (
            <div className="mt-8 pb-16 space-y-3">
              <button
                type="button"
                onClick={handleConfirmPlan}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#59ffa0] text-[#121113] font-sans font-bold text-sm hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20 active:scale-[0.98] transition-all duration-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Confirm This Plan
              </button>
              <button
                type="button"
                onClick={handleSaveDayPlan}
                className="w-full py-4 rounded-2xl border border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#f9fdff] transition-all"
              >
                {saved ? '✓ Plan Saved!' : 'Save My Day Plan'}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-3 rounded-2xl border border-white/10 text-foreground/70 text-sm hover:bg-white/5 transition"
              >
                {linkCopied ? '✓ Link Copied!' : 'Share My Plan'}
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = `/events?date=${selectedDate}` }}
                className="w-full py-3 rounded-2xl border border-white/10 text-foreground/70 text-sm hover:bg-white/5 transition"
              >
                Browse Events for This Day
              </button>
              <p className="text-center text-xs text-foreground/30 pt-1">
                Your plan is saved to your profile and accessible from your dashboard.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
