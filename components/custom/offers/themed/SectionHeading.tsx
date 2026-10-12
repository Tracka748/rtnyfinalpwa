'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { cn } from '@/lib/utils'
import type { CampaignTheme } from '../themes'
import { GRAFFITI_FONT_STACK, graffitiFont } from './graffitiFont'
import { CAKE_GOLD } from './CakeIcon'
import { Sprinkles } from './Sprinkles'

interface SectionHeadingProps {
  title: string
  // Real heading level. Section cards use h2; nest under one with h3.
  level?: 2 | 3
  // Small status tag (e.g. "Needed to submit"), rendered on its own line BELOW the title.
  badge?: ReactNode
  theme: CampaignTheme
  className?: string
}

// ~34px at 360px growing to 38px at 430px+ (Caveat Brush has a small x-height).
const SIZE = 'clamp(34px, calc(34px + (100vw - 360px) * 0.0571), 38px)'

// Two thin black offsets (≤ 1px blur) keep the brush strokes crisp.
const PAINT_SHADOW = '0 2px 0 #000, 0 3px 1px rgba(0,0,0,0.6)'

// The pink underline is this fraction of the title block's width.
const UNDERLINE_FRACTION = 0.58

const TRAIL_HEIGHT = 36
const TRAIL_GAP = 8
// Caveat Brush's content area starts 0.96em above the baseline, and its x-height is
// 0.42em, so the middle of the x-height sits 0.75em below the top of a text fragment.
const X_HEIGHT_CENTER_EM = 0.75

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Same title → same sprinkle layout on every render and every device.
function seedFor(title: string): number {
  let h = 2166136261
  for (let i = 0; i < title.length; i++) h = Math.imul(h ^ title.charCodeAt(i), 16777619)
  return h >>> 0
}

// About one capsule per 18px (max 16). Narrow gaps get at most 3, and below 16px none.
function trailCount(width: number): number {
  if (width < 16) return 0
  if (width < 40) return Math.min(3, Math.floor(width / 14))
  return Math.min(16, Math.round(width / 18))
}

interface TrailBox {
  left: number
  top: number
  width: number
}

// Where the sprinkle trail goes, relative to the heading row: from the end of the
// title's LAST line (or the end of the underline, if that is further right) to the
// row's right edge, centered on the x-height of that line. Measured with a Range, so
// it also works when the title wraps (flex can't put something beside a last line),
// and re-measured when the row resizes or the font finishes loading.
function useTrailBox(
  rowRef: RefObject<HTMLDivElement | null>,
  blockRef: RefObject<HTMLDivElement | null>,
  headingRef: RefObject<HTMLHeadingElement | null>
): TrailBox | null {
  const [box, setBox] = useState<TrailBox | null>(null)

  useIsoLayoutEffect(() => {
    const row = rowRef.current
    const block = blockRef.current
    const heading = headingRef.current
    if (!row || !block || !heading) return

    const measure = () => {
      const rowRect = row.getBoundingClientRect()
      const blockRect = block.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(heading)
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0)
      if (!rects.length) return

      // The last line is whatever sits lowest; take the right-most fragment on it.
      const bottom = Math.max(...rects.map((r) => r.bottom))
      const lastLine = rects.filter((r) => r.bottom > bottom - 2)
      const textRight = Math.max(...lastLine.map((r) => r.right))
      const lineTop = Math.min(...lastLine.map((r) => r.top))
      // Never start the trail under the underline.
      const underlineRight = blockRect.left + blockRect.width * UNDERLINE_FRACTION

      const fontSize = parseFloat(getComputedStyle(heading).fontSize) || 34
      const left = Math.round(Math.max(textRight, underlineRight) - rowRect.left + TRAIL_GAP)
      // Even widths only, so sub-pixel changes don't re-layout the capsules.
      const width = Math.max(0, Math.floor((rowRect.width - left) / 2) * 2)
      const top = Math.round(lineTop - rowRect.top + fontSize * X_HEIGHT_CENTER_EM - TRAIL_HEIGHT / 2)

      setBox((prev) => (prev && prev.left === left && prev.top === top && prev.width === width ? prev : { left, top, width }))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    observer.observe(block)
    // Swapping in the real font changes where the text ends without resizing the row.
    const fonts = document.fonts
    fonts?.addEventListener?.('loadingdone', measure)
    void fonts?.ready.then(measure)
    return () => {
      observer.disconnect()
      fonts?.removeEventListener?.('loadingdone', measure)
    }
  }, [rowRef, blockRef, headingRef])

  return box
}

// Hand-drawn 2px underline, ~58% of the title's width.
function Underline({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      className="mt-0.5 block h-1.5"
      style={{ width: `${UNDERLINE_FRACTION * 100}%` }}
    >
      <path
        d="M2 4 C20 1.2 36 5.6 56 3 S90 2.4 98 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Themed section-card heading: Caveat Brush in the theme's mint with a pink
// underline, and a trail of sprinkles running from the end of the title to the card's
// right edge, one per slot and fading out. Decorations: 2 (underline + trail). Real text,
// no emoji; the only motion is the sprinkles' reduced-motion-safe fade-in.
export function SectionHeading({ title, level = 2, badge, theme, className }: SectionHeadingProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  const colors = theme.graffiti
  const seed = seedFor(title)
  // Pink, baby blue, mint and gold (the first three come from the theme).
  const palette = [theme.accent, theme.accent2, colors.text, CAKE_GOLD]

  const rowRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const box = useTrailBox(rowRef, blockRef, headingRef)
  const count = box ? trailCount(box.width) : 0

  return (
    <div
      className={cn(graffitiFont.variable, 'space-y-2', className)}
      style={{ '--section-heading-size': SIZE } as CSSProperties}
    >
      {/* One line of height is always reserved, so a font swap never shifts the card. */}
      <div
        ref={rowRef}
        className="relative flex items-start"
        style={{ minHeight: 'calc(var(--section-heading-size) * 1.2)' }}
      >
        {/* The title keeps its natural width (it wraps only when it can't fit the row). */}
        <div ref={blockRef} className="min-w-0 max-w-full">
          <Heading
            ref={headingRef}
            className="text-left break-words"
            style={{
              margin: 0,
              fontFamily: GRAFFITI_FONT_STACK,
              fontSize: 'var(--section-heading-size)',
              color: colors.text,
              letterSpacing: '0.01em',
              // Descenders (0.3em) stay inside the box, clear of the underline.
              lineHeight: 1.1,
              paddingBottom: '0.08em',
              // Thin black outline behind the mint fill, plus two thin shadows.
              WebkitTextStroke: '1px #000',
              paintOrder: 'stroke fill',
              textShadow: PAINT_SHADOW,
              textWrap: 'balance',
            }}
          >
            {title}
          </Heading>
          <Underline color={colors.underline} />
        </div>

        {/* The trail is absolutely positioned from the measurement above, so it can never
            push or shrink the title, overflow the card, or touch text or tap targets. */}
        {box && count > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute overflow-hidden"
            style={{ left: box.left, top: box.top, width: box.width, height: TRAIL_HEIGHT }}
          >
            <Sprinkles
              palette={palette}
              area="trail"
              seed={seed}
              count={count}
              size={12}
              thickness={4}
              width={box.width}
              height={TRAIL_HEIGHT}
            />
          </div>
        )}
      </div>

      {badge && <div>{badge}</div>}
    </div>
  )
}
