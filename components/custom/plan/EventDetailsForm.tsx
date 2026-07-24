'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { EventDetails } from '@/hooks/usePlanBuilder'
import { TimePicker } from '@/components/ui/time-picker/TimePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: 'Birthday Party',       icon: '🎂' },
  { value: 'Corporate Event',      icon: '💼' },
  { value: 'Wedding',              icon: '💍' },
  { value: 'Holiday Party',        icon: '🎄' },
  { value: 'Graduation',           icon: '🎓' },
  { value: 'Private Celebration',  icon: '🥂' },
  { value: 'Brand Activation',     icon: '🚀' },
  { value: 'Fundraiser',           icon: '🤝' },
  { value: 'Other',                icon: '✨' },
]

const GUEST_COUNTS = [
  'Under 25',
  '25–50',
  '51–100',
  '101–200',
  '201–500',
  '500+',
]

const BUDGET_RANGES = [
  'Under $500',
  '$500–$1,000',
  '$1,000–$2,500',
  '$2,500–$5,000',
  '$5,000+',
]

// ─── Crew types ───────────────────────────────────────────────────────────────

interface CrewOption {
  id: string
  name: string
  member_count: number
  max_members: number | null
  is_private: boolean | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a numeric member count to the nearest GUEST_COUNTS bucket */
function memberCountToBucket(count: number): string {
  if (count < 25)  return 'Under 25'
  if (count <= 50)  return '25–50'
  if (count <= 100) return '51–100'
  if (count <= 200) return '101–200'
  if (count <= 500) return '201–500'
  return '500+'
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-label text-[10px] tracking-widest text-[#7DD8E8] mb-2">
      {children}
    </label>
  )
}

function inputClass(active?: boolean) {
  return cn(
    'w-full bg-[#1a1819] border rounded-xl px-4 py-3 text-[#f9fdff] font-sans text-sm',
    'placeholder:text-[#7DD8E8]/40 outline-none transition-all duration-200',
    active
      ? 'border-[#59ffa0] ring-2 ring-[#59ffa0]/20'
      : 'border-[#2a2829] focus:border-[#59ffa0] focus:ring-2 focus:ring-[#59ffa0]/20'
  )
}

// ─── Crew selector section ────────────────────────────────────────────────────

interface CrewSelectorProps {
  selectedCrewId: string | null
  onSelect: (crew: CrewOption) => void
}

function CrewSelector({ selectedCrewId, onSelect }: CrewSelectorProps) {
  const [crews, setCrews]     = useState<CrewOption[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady]     = useState(false)  // false = don't render yet (avoid layout flash)

  const fetchCrews = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/crews/mine')
      // If not authenticated, silently hide the section
      if (res.status === 401) { setReady(true); setLoading(false); return }
      if (!res.ok) { setReady(true); setLoading(false); return }
      const json = await res.json()
      setCrews(json.data?.crews ?? [])
    } catch {
      // Network error — fail silently, section just won't show
    } finally {
      setLoading(false)
      setReady(true)
    }
  }, [])

  useEffect(() => { fetchCrews() }, [fetchCrews])

  // Don't flash an empty section while loading
  if (!ready || loading) return null

  // ── No crews state ────────────────────────────────────────────────────────
  if (crews.length === 0) {
    return (
      <div>
        <FieldLabel>WHO'S COMING?</FieldLabel>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#2a2829] bg-[#1a1819]/50">
          <span className="text-lg shrink-0">🫂</span>
          <p className="font-sans text-xs text-[#7DD8E8]/60 leading-relaxed flex-1">
            No crews yet —{' '}
            <Link
              href="/crews"
              className="text-[#1ac8ed] underline underline-offset-2 hover:text-[#1ac8ed]/80 transition-colors"
            >
              create one
            </Link>{' '}
            to unlock group discounts.
          </p>
        </div>
      </div>
    )
  }

  // ── Has crews ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel>WHO'S COMING?</FieldLabel>
        <Link
          href="/crews"
          className="font-sans text-[10px] text-[#1ac8ed]/70 hover:text-[#1ac8ed] transition-colors"
        >
          Manage crews →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {crews.map(crew => {
          const selected = selectedCrewId === crew.id
          return (
            <button
              key={crew.id}
              type="button"
              onClick={() => onSelect(crew)}
              className={cn(
                'group relative flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200',
                selected
                  ? 'border-[#59ffa0] bg-[#59ffa0]/8 ring-1 ring-[#59ffa0]/20'
                  : 'border-[#2a2829] bg-[#1a1819] hover:border-[#59ffa0]/30 hover:bg-[#242324]'
              )}
            >
              {/* Selected checkmark */}
              <div
                className={cn(
                  'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150',
                  selected
                    ? 'border-[#59ffa0] bg-[#59ffa0]'
                    : 'border-[#2a2829] group-hover:border-[#59ffa0]/40'
                )}
              >
                {selected && (
                  <svg className="w-2.5 h-2.5 text-[#121113]" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      'font-header text-sm font-bold leading-tight truncate',
                      selected ? 'text-[#59ffa0]' : 'text-[#f9fdff]'
                    )}
                  >
                    {crew.name}
                  </span>
                  {crew.is_private && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#ff6b9d]/10 border border-[#ff6b9d]/20 text-[#ff6b9d] font-sans">
                      Private
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3 text-[#7DD8E8]/50 shrink-0" viewBox="0 0 12 12" fill="none">
                    <circle cx="4.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1" />
                    <path d="M1 10c0-1.9 1.6-3.5 3.5-3.5S8 8.1 8 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    <circle cx="9" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
                    <path d="M9 7c1.4 0 2.5 1.1 2.5 2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <span className="font-sans text-[10px] text-[#7DD8E8]/60">
                    <span className={cn('font-medium', selected ? 'text-[#59ffa0]/80' : 'text-[#7DD8E8]')}>
                      {crew.member_count}
                    </span>
                    {crew.max_members ? `/${crew.max_members}` : ''} members
                  </span>
                </div>
              </div>

              {/* Guest range hint on hover/select */}
              <div
                className={cn(
                  'shrink-0 font-sans text-[9px] px-2 py-1 rounded-lg border transition-all duration-150',
                  selected
                    ? 'border-[#59ffa0]/30 bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] text-[#7DD8E8]/30 opacity-0 group-hover:opacity-100'
                )}
              >
                {memberCountToBucket(crew.member_count)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selection feedback */}
      {selectedCrewId && (() => {
        const crew = crews.find(c => c.id === selectedCrewId)
        if (!crew) return null
        return (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#59ffa0]/6 border border-[#59ffa0]/15">
            <svg className="w-3 h-3 text-[#59ffa0] shrink-0" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
              <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-sans text-[10px] text-[#59ffa0]/80">
              Guest count set to{' '}
              <span className="font-semibold text-[#59ffa0]">{memberCountToBucket(crew.member_count)}</span>
              {' '}based on <span className="font-semibold">{crew.name}</span> ({crew.member_count} members)
            </p>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventDetailsFormProps {
  eventDetails: EventDetails
  onUpdate: <K extends keyof EventDetails>(key: K, value: EventDetails[K]) => void
  canProceed: boolean
  onNext: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventDetailsForm({ eventDetails, onUpdate, canProceed, onNext }: EventDetailsFormProps) {
  // Track which crew set the guest count so we can clear it on manual override
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null)

  function handleCrewSelect(crew: CrewOption) {
    if (selectedCrewId === crew.id) {
      // Deselect
      setSelectedCrewId(null)
      onUpdate('guestCount', '')
    } else {
      setSelectedCrewId(crew.id)
      onUpdate('guestCount', memberCountToBucket(crew.member_count))
    }
  }

  function handleManualGuestCount(count: string) {
    setSelectedCrewId(null)   // clear crew selection when user overrides manually
    onUpdate('guestCount', count)
  }

  return (
    <div className="space-y-8">
      {/* Event type grid */}
      <div>
        <FieldLabel>What kind of event? *</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EVENT_TYPES.map(({ value, icon }) => {
            const selected = eventDetails.eventType === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onUpdate('eventType', value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-200',
                  selected
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff] hover:border-[#59ffa0]/40 hover:bg-[#242324]'
                )}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-[11px] font-sans font-medium leading-tight">{value}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date + Time row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Event Date</FieldLabel>
          <input
            type="date"
            value={eventDetails.eventDate}
            onChange={e => onUpdate('eventDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={inputClass()}
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <TimePicker
            label="START TIME"
            value={eventDetails.timeStart}
            onChange={val => onUpdate('timeStart', val)}
          />
        </div>
        <div>
          <TimePicker
            label="END TIME"
            value={eventDetails.timeEnd}
            onChange={val => onUpdate('timeEnd', val)}
          />
        </div>
      </div>

      {/* ── Who's coming? (crew selector) ─────────────────────────────────── */}
      <CrewSelector
        selectedCrewId={selectedCrewId}
        onSelect={handleCrewSelect}
      />

      {/* Guest count */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Expected Guest Count</FieldLabel>
          {selectedCrewId && (
            <span className="font-sans text-[10px] text-[#59ffa0]/60 tracking-wide">
              set by crew · click to override
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GUEST_COUNTS.map(count => {
            const selected = eventDetails.guestCount === count
            const fromCrew = selected && selectedCrewId !== null
            return (
              <button
                key={count}
                type="button"
                onClick={() => handleManualGuestCount(count)}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-sans transition-all duration-200',
                  fromCrew
                    ? 'border-[#59ffa0]/60 bg-[#59ffa0]/10 text-[#59ffa0]'
                    : selected
                    ? 'border-[#1ac8ed] bg-[#1ac8ed]/10 text-[#1ac8ed]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#1ac8ed]/40'
                )}
              >
                {count}
              </button>
            )
          })}
        </div>
      </div>

      {/* Venue */}
      <div>
        <FieldLabel>Do you have a venue?</FieldLabel>
        <div className="flex gap-3">
          {[
            { label: 'Yes, I have a venue', value: true  },
            { label: 'No, I need help finding one.', value: false },
          ].map(({ label, value }) => {
            const selected = eventDetails.hasVenue === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => onUpdate('hasVenue', value)}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-xl border text-sm font-sans transition-all duration-200',
                  selected
                    ? 'border-[#ff6b9d] bg-[#ff6b9d]/10 text-[#ff6b9d]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#ff6b9d]/40'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Budget */}
      <div>
        <FieldLabel>Budget Range</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {BUDGET_RANGES.map(range => {
            const selected = eventDetails.budgetRange === range
            return (
              <button
                key={range}
                type="button"
                onClick={() => onUpdate('budgetRange', range)}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-sans transition-all duration-200',
                  selected
                    ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#59ffa0]/40'
                )}
              >
                {range}
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-sans font-semibold text-sm transition-all duration-200',
            canProceed
              ? 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 hover:shadow-lg hover:shadow-[#59ffa0]/20'
              : 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
          )}
        >
          Browse Vendors
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
