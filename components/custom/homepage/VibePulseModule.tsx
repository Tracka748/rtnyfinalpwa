'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import VibeTagPickerDialog from './VibeTagPickerDialog'

interface VibePulseModuleProps {
  onSelectPrompt?: () => void
  onSelectPersonalized?: () => void
}

type Mode = 'idle' | 'split'

const SIZE = 120
const RING_RADIUS = 52
const DOT_COUNT = 24
const DOT_RADIUS = 2.2
const CENTER_SIZE = 72

function PulseRing() {
  const center = SIZE / 2
  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const angle = (i / DOT_COUNT) * Math.PI * 2
    return {
      cx: center + RING_RADIUS * Math.cos(angle),
      cy: center + RING_RADIUS * Math.sin(angle),
    }
  })

  return (
    <>
      {/* Dotted pulse ring — reuses the existing sunPulse keyframe (globals.css),
          slowed down here for a calmer "monitoring the pulse" feel. */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 motion-safe:animate-[sunPulse_6s_ease-in-out_infinite]"
        style={{ transformOrigin: '50% 50%' }}
      >
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={DOT_RADIUS} className="fill-accent-primary" />
        ))}
      </svg>

      {/* Center puck */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full bg-surface border border-accent-primary/30"
        style={{ width: CENTER_SIZE, height: CENTER_SIZE }}
      >
        <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-accent-primary">
          Vibe
        </span>
      </div>
    </>
  )
}

export default function VibePulseModule({ onSelectPrompt, onSelectPersonalized }: VibePulseModuleProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'prompt' | 'personalized'>('prompt')

  const openSplit = () => setMode('split')
  const collapse = () => setMode('idle')

  // Both options now open the same tag-picker dialog, just in different modes.
  // The module no longer collapses immediately on tap — VibeTagPickerDialog's
  // onShareComplete (wired to `collapse` below) is what returns this to idle
  // once the flow actually completes (share posted, or vibes saved).
  const selectPrompt = () => {
    onSelectPrompt?.()
    setPickerMode('prompt')
    setPickerOpen(true)
  }

  const selectPersonalized = () => {
    onSelectPersonalized?.()
    setPickerMode('personalized')
    setPickerOpen(true)
  }

  return (
    <>
      {/* Height is pinned here, once, for both modes — nothing below this module
          should ever see a size change. overflow-hidden is a deliberate belt-and-
          suspenders guard: even if inner content briefly miscalculates during the
          width transition, it clips instead of pushing the page. */}
      <div className="relative w-full overflow-hidden" style={{ height: SIZE }}>
        <div
          className="flex items-stretch h-full transition-[gap] duration-300 ease-out"
          style={{ gap: mode === 'idle' ? 8 : 0 }}
        >
          {/* Left cell: the pulse circle itself morphs into the left (cyan) half —
              same element, so this reads as one control dividing, not a swap. */}
          <button
            type="button"
            onClick={mode === 'idle' ? openSplit : selectPrompt}
            aria-label={mode === 'idle' ? 'Vibe Pulse' : "What's the Vibe?"}
            className={cn(
              'relative shrink-0 flex items-center justify-center overflow-hidden touch-manipulation select-none transition-all duration-300 ease-out active:scale-[0.98]',
              mode === 'idle'
                ? 'rounded-full bg-transparent border-0 p-0'
                : 'rounded-l-2xl border border-r-0 border-accent-secondary/30 bg-accent-secondary/10 hover:bg-accent-secondary/15'
            )}
            style={{ width: mode === 'idle' ? SIZE : '50%', height: SIZE }}
          >
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
                mode === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              <PulseRing />
            </div>
            {/* Compact split content: icon + label only. At a 120px-tall row, a
                subtitle either gets clipped or forces the row taller — icon and
                label win per spec, subtitle is dropped rather than squeezed in. */}
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center transition-opacity duration-200 delay-100',
                mode === 'split' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              <span className="text-xl leading-none">👀</span>
              <span className="font-sans font-semibold text-text-primary text-[11px] leading-tight">
                What&apos;s the Vibe?
              </span>
            </div>
          </button>

          {/* Right cell: "WHAT'S THE VIBE?" heading (idle) <-> "My Vibes" half (split) */}
          <div className="relative flex-1" style={{ height: SIZE }}>
            <button
              type="button"
              onClick={openSplit}
              aria-hidden={mode !== 'idle'}
              tabIndex={mode === 'idle' ? 0 : -1}
              className={cn(
                'absolute inset-0 flex items-center touch-manipulation select-none transition-opacity duration-200',
                mode === 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              {/* Large display heading, not the LED dot-matrix treatment — at this
                  compact inline size (next to a 120px circle, ~260px of width) the
                  LED glyphs used for "PLAN YOUR DAY" would either be unreadably tiny
                  or too wide to fit without wrapping mid-character. The existing
                  Rokkitt display font (font-header) reads better here. */}
              <span className="font-header font-bold uppercase leading-[1.05] text-2xl text-text-primary text-left">
                What&apos;s the
                <br />
                Vibe?
              </span>
            </button>

            <button
              type="button"
              onClick={selectPersonalized}
              aria-label="My Vibes"
              aria-hidden={mode !== 'split'}
              tabIndex={mode === 'split' ? 0 : -1}
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center overflow-hidden touch-manipulation select-none transition-opacity duration-200 delay-100 active:scale-[0.98]',
                'rounded-r-2xl border border-l-0 border-accent-primary/30 bg-accent-primary/10 hover:bg-accent-primary/15',
                mode === 'split' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              <span className="text-xl leading-none">⭐</span>
              <span className="font-sans font-semibold text-text-primary text-[11px] leading-tight">My Vibes</span>
            </button>
          </div>
        </div>

        {/* Collapse affordance — small, integrated into the seam rather than a
            floating overlay-dismiss control. Reads as "tap to retract" alongside
            the two halves it sits between. */}
        {mode === 'split' && (
          <button
            type="button"
            onClick={collapse}
            aria-label="Collapse"
            className="absolute top-1 left-1/2 z-10 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full text-text-secondary/60 hover:text-text-primary transition-colors touch-manipulation"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <VibeTagPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode={pickerMode}
        onShareComplete={collapse}
      />
    </>
  )
}
