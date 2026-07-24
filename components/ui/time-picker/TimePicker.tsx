'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimePickerProps {
  value?: string
  onChange: (time: string) => void
  label?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1) // 1–12
const MINUTES = ['00', '30']
const PERIODS = ['AM', 'PM']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "H:MM AM/PM" → picker indices, or null if it doesn't land on the 30-min grid this picker supports */
function parseTimeIndices(display: string): { hourIndex: number; minuteIndex: number; periodIndex: number } | null {
  const match = display.match(/^(\d{1,2}):(00|30)\s*(AM|PM)$/i)
  if (!match) return null
  const hour = parseInt(match[1], 10)
  if (hour < 1 || hour > 12) return null
  const hourIndex = HOURS.indexOf(hour)
  const minuteIndex = MINUTES.indexOf(match[2])
  const periodIndex = PERIODS.indexOf(match[3].toUpperCase())
  if (hourIndex === -1 || minuteIndex === -1 || periodIndex === -1) return null
  return { hourIndex, minuteIndex, periodIndex }
}

/** "HH:MM" → "H:MM AM/PM" */
function nativeToDisplay(native: string): string {
  const [hStr, mStr] = native.split(':')
  let h = parseInt(hStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${mStr} ${period}`
}

/** "H:MM AM/PM" → "HH:MM" for populating native input */
function displayToNative(display: string): string {
  const match = display.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let h = parseInt(match[1], 10)
  const m = match[2]
  const period = match[3].toUpperCase()
  if (period === 'AM' && h === 12) h = 0
  else if (period === 'PM' && h !== 12) h += 12
  return `${h.toString().padStart(2, '0')}:${m}`
}

// ─── Pill + popover ───────────────────────────────────────────────────────────

interface TimePillPopoverProps {
  items: string[]
  selectedIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (index: number) => void
}

/** A closed pill showing the current value; tapping it opens a scrollable list of options. */
function TimePillPopover({ items, selectedIndex, open, onOpenChange, onSelect }: TimePillPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-1 h-14 rounded-xl border border-white/10 bg-[#1a1a1a] text-[#59FFA0] text-xl font-label font-bold flex items-center justify-center transition-colors duration-150 hover:border-[#59FFA0]/40"
        >
          {items[selectedIndex]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-20 max-h-48 overflow-y-auto p-1">
        {items.map((item, i) => {
          const selected = i === selectedIndex
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-center text-sm font-label transition-colors duration-150',
                selected
                  ? 'bg-[#59FFA0]/10 text-[#59FFA0] font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white/90'
              )}
            >
              {item}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [showNative,    setShowNative]    = useState(() => !!value && !parseTimeIndices(value))
  const [nativeValue,   setNativeValue]   = useState(() => (value && !parseTimeIndices(value)) ? displayToNative(value) : '')
  const [customDisplay, setCustomDisplay] = useState<string | null>(() => (value && !parseTimeIndices(value)) ? value : null)

  const [hourIndex,   setHourIndex]   = useState(() => parseTimeIndices(value ?? '')?.hourIndex ?? 0)
  const [minuteIndex, setMinuteIndex] = useState(() => parseTimeIndices(value ?? '')?.minuteIndex ?? 0)
  const [periodIndex, setPeriodIndex] = useState(() => parseTimeIndices(value ?? '')?.periodIndex ?? 0)

  const [hourOpen, setHourOpen]     = useState(false)
  const [minuteOpen, setMinuteOpen] = useState(false)

  function emitChange(h: number, m: number, p: number) {
    onChange(`${HOURS[h]}:${MINUTES[m]} ${PERIODS[p]}`)
  }

  function handleHourSelect(idx: number) {
    setHourIndex(idx)
    emitChange(idx, minuteIndex, periodIndex)
    setHourOpen(false)
  }

  function handleMinuteSelect(idx: number) {
    setMinuteIndex(idx)
    emitChange(hourIndex, idx, periodIndex)
    setMinuteOpen(false)
  }

  function handlePeriodSelect(idx: number) {
    setPeriodIndex(idx)
    emitChange(hourIndex, minuteIndex, idx)
  }

  function handleOtherTime() {
    setShowNative(true)
  }

  function handleBackToChips() {
    setShowNative(false)
    setNativeValue('')
    setCustomDisplay(null)
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const native = e.target.value
    setNativeValue(native)
    if (!native) { setCustomDisplay(null); return }
    const display = nativeToDisplay(native)
    setCustomDisplay(display)
    onChange(display)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 w-full max-w-[280px]">
      {label && (
        <span className="font-label text-xs uppercase tracking-wider text-[#1AC8ED] mb-2">
          {label}
        </span>
      )}

      {/* ── Hour box, minute box, and stacked AM/PM toggle in one row (always visible unless in native mode) ── */}
      {!showNative && (
        <div className="flex items-stretch justify-center gap-2">
          <TimePillPopover
            items={HOURS.map(String)}
            selectedIndex={hourIndex}
            open={hourOpen}
            onOpenChange={setHourOpen}
            onSelect={handleHourSelect}
          />
          <span className="flex items-center text-white/30 text-xl font-label font-semibold">:</span>
          <TimePillPopover
            items={MINUTES}
            selectedIndex={minuteIndex}
            open={minuteOpen}
            onOpenChange={setMinuteOpen}
            onSelect={handleMinuteSelect}
          />

          <div className="flex flex-col gap-1 w-14">
            {PERIODS.map((period, i) => {
              const selected = periodIndex === i
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => handlePeriodSelect(i)}
                  className={cn(
                    'flex-1 rounded-lg border text-xs font-sans font-semibold transition-all duration-200 flex items-center justify-center',
                    selected
                      ? 'border-[#59FFA0] bg-[#59FFA0]/10 text-[#59FFA0]'
                      : 'border-[#2a2829] bg-[#1a1819] text-[#f9fdff]/70 hover:border-[#59FFA0]/40'
                  )}
                >
                  {period}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── "Other time" link ────────────────────────────────────────────── */}
      {!showNative && (
        <button
          type="button"
          onClick={handleOtherTime}
          className="self-start font-sans text-xs text-white/40 hover:text-white/70 transition-colors mt-2"
        >
          Other time →
        </button>
      )}

      {/* ── Native input fallback ─────────────────────────────────────────── */}
      {showNative && (
        <div className="flex flex-col gap-2">
          <input
            type="time"
            aria-label="Enter a custom time"
            value={nativeValue}
            onChange={handleNativeChange}
            className={cn(
              'w-full max-w-[180px] bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2',
              'text-white/80 text-sm font-sans outline-none',
              'focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0]/20 transition-all',
              '[color-scheme:dark]'
            )}
          />

          {/* Confirmation chip showing the selected time */}
          {customDisplay && (
            <span className="inline-flex self-start px-3 py-1.5 rounded-xl border border-[#59FFA0] text-[#59FFA0] bg-[#59FFA0]/10 text-sm font-label">
              {customDisplay}
            </span>
          )}

          <button
            type="button"
            onClick={handleBackToChips}
            className="self-start font-sans text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ← Use time picker
          </button>
        </div>
      )}
    </div>
  )
}

export default TimePicker
