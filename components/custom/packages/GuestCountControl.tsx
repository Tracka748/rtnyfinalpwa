'use client'

import { useEffect, useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { clampGuestCount, parseGuestInput } from '@/lib/package-selection'

interface Props {
  value: number
  min: number | null
  max: number | null
  onChange: (n: number) => void
}

export function GuestCountControl({ value, min, max, onChange }: Props) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = (n: number) => {
    const clamped = clampGuestCount(n, min, max)
    setDraft(String(clamped))
    if (clamped !== value) onChange(clamped)
  }
  const lo = clampGuestCount(0, min, max)
  const hi = clampGuestCount(Number.MAX_SAFE_INTEGER, min, max)

  const btn =
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text-primary transition-colors hover:border-accent-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-40'

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <label htmlFor={id} className="font-label block text-xs tracking-widest text-text-secondary">
          Guests
        </label>
        <p className="mt-1 text-xs text-text-primary/60">
          {min != null || max != null ? `This package is for ${lo}–${hi} guests` : 'Some prices depend on guest count'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label="Fewer guests" disabled={value <= lo} onClick={() => commit(value - 1)}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={e => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
          onBlur={() => commit(parseGuestInput(draft, value))}
          onKeyDown={e => {
            if (e.key === 'Enter') commit(parseGuestInput(draft, value))
          }}
          className="h-11 w-20 rounded-xl border border-border bg-background text-center text-base tabular-nums text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
        <button type="button" className={btn} aria-label="More guests" disabled={value >= hi} onClick={() => commit(value + 1)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
