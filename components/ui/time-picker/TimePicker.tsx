'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimePickerProps {
  value?: string
  onChange: (time: string) => void
  label?: string
}

type Band = 'Morning' | 'Afternoon' | 'Evening' | 'Late Night'

// ─── Constants ────────────────────────────────────────────────────────────────

const BANDS: Band[] = ['Morning', 'Afternoon', 'Evening', 'Late Night']

const SLOTS: Record<Band, string[]> = {
  'Morning': [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  ],
  'Afternoon': [
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  ],
  'Evening': [
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
    '10:00 PM', '10:30 PM',
  ],
  'Late Night': [
    '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM',
    '1:00 AM', '1:30 AM', '2:00 AM',
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bandForSlot(slot: string): Band | null {
  for (const band of BANDS) {
    if (SLOTS[band].includes(slot)) return band
  }
  return null
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

// ─── Component ────────────────────────────────────────────────────────────────

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [selectedBand,  setSelectedBand]  = useState<Band | null>(null)
  const [selectedSlot,  setSelectedSlot]  = useState<string | null>(null)
  const [showNative,    setShowNative]    = useState(false)
  const [nativeValue,   setNativeValue]   = useState('')
  const [customDisplay, setCustomDisplay] = useState<string | null>(null)

  // Hydrate from value prop on mount only
  useEffect(() => {
    if (!value) return
    const band = bandForSlot(value)
    if (band) {
      setSelectedBand(band)
      setSelectedSlot(value)
    } else {
      // Value exists but doesn't match a slot — show in native fallback
      setShowNative(true)
      setNativeValue(displayToNative(value))
      setCustomDisplay(value)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBandSelect(band: Band) {
    setSelectedBand(band)
    setSelectedSlot(null)
    setShowNative(false)
    setNativeValue('')
    setCustomDisplay(null)
  }

  function handleSlotSelect(slot: string) {
    setSelectedSlot(slot)
    onChange(slot)
  }

  function handleOtherTime() {
    setShowNative(true)
    setSelectedBand(null)
    setSelectedSlot(null)
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
    setSelectedBand(null)
    setSelectedSlot(null)
    onChange(display)
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const bandBase     = 'px-4 py-2 rounded-full text-sm font-label border transition-all duration-150 cursor-pointer'
  const bandOn       = 'border-[#1AC8ED] text-[#1AC8ED] bg-[#1AC8ED]/10'
  const bandOff      = 'bg-[#1a1a1a] border-white/10 text-white/70 hover:border-white/25 hover:text-white/90'

  const slotBase     = 'py-2 rounded-xl text-sm font-label border transition-all duration-150 cursor-pointer text-center'
  const slotOn       = 'border-[#59FFA0] text-[#59FFA0] bg-[#59FFA0]/10'
  const slotOff      = 'bg-[#1a1a1a] border-white/10 text-white/70 hover:border-white/25 hover:text-white/90'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 w-full max-w-[280px]">
      <style>{`
        @keyframes tp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .tp-fade-in {
          animation: tp-fade-in 150ms ease-out both;
        }
      `}</style>

      {label && (
        <span className="font-label text-xs uppercase tracking-wider text-[#1AC8ED] mb-2">
          {label}
        </span>
      )}

      {/* ── Band chips (always visible unless in native mode) ────────────── */}
      {!showNative && (
        <div className="flex flex-col gap-2">
          {BANDS.map(band => (
            <button
              key={band}
              type="button"
              onClick={() => handleBandSelect(band)}
              className={cn(bandBase, selectedBand === band ? bandOn : bandOff)}
            >
              {band}
            </button>
          ))}
        </div>
      )}

      {/* ── Slot grid (fades in when a band is selected) ─────────────────── */}
      {!showNative && selectedBand && (
        <div
          key={selectedBand}
          className="grid grid-cols-4 gap-1.5 tp-fade-in"
        >
          {SLOTS[selectedBand].map(slot => (
            <button
              key={slot}
              type="button"
              onClick={() => handleSlotSelect(slot)}
              className={cn(slotBase, selectedSlot === slot ? slotOn : slotOff)}
            >
              {slot}
            </button>
          ))}
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
