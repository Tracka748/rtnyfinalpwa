'use client'

import { cn } from '@/lib/utils'
import type { EventDetails } from '@/hooks/usePlanBuilder'

const EVENT_TYPES = [
  { value: 'Birthday Party', icon: '🎂' },
  { value: 'Corporate Event', icon: '💼' },
  { value: 'Wedding', icon: '💍' },
  { value: 'Holiday Party', icon: '🎄' },
  { value: 'Graduation', icon: '🎓' },
  { value: 'Private Celebration', icon: '🥂' },
  { value: 'Brand Activation', icon: '🚀' },
  { value: 'Fundraiser', icon: '🤝' },
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

interface EventDetailsFormProps {
  eventDetails: EventDetails
  onUpdate: <K extends keyof EventDetails>(key: K, value: EventDetails[K]) => void
  canProceed: boolean
  onNext: () => void
}

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

export function EventDetailsForm({ eventDetails, onUpdate, canProceed, onNext }: EventDetailsFormProps) {
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
          <FieldLabel>Start Time</FieldLabel>
          <input
            type="time"
            value={eventDetails.timeStart}
            onChange={e => onUpdate('timeStart', e.target.value)}
            className={inputClass()}
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <FieldLabel>End Time</FieldLabel>
          <input
            type="time"
            value={eventDetails.timeEnd}
            onChange={e => onUpdate('timeEnd', e.target.value)}
            className={inputClass()}
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Guest count */}
      <div>
        <FieldLabel>Expected Guest Count</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {GUEST_COUNTS.map(count => {
            const selected = eventDetails.guestCount === count
            return (
              <button
                key={count}
                type="button"
                onClick={() => onUpdate('guestCount', count)}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-sans transition-all duration-200',
                  selected
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
            { label: 'Yes, I have a venue', value: true },
            { label: 'No, I need one', value: false },
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
