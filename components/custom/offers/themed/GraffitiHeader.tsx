'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { CampaignTheme } from '../themes'
import { GRAFFITI_CAP_WIDTH_EM, GRAFFITI_FONT_STACK, graffitiFont } from './graffitiFont'
import { CakeIcon } from './CakeIcon'
import { ThemedImage } from './ThemedImage'

interface GraffitiHeaderProps {
  title: string
  // Renders a real <h1> or <h2>.
  level: 1 | 2
  // 'hero' for welcome/success, 'section' for the review preview.
  size: 'hero' | 'section'
  theme: CampaignTheme
  // Small status tag rendered below the title (never inside it).
  badge?: ReactNode
  // Optional lettering art (WebP on black). Missing or broken files fall back to font mode.
  imageSrc?: string
  className?: string
}

// Caveat Brush has a small x-height, so sizes run large: hero ~51px at 360px →
// 74px at 430px+, section ~39px → 53px (15% up from 44→64 / 34→46), still capped by
// fit-to-width. The cake is 64px. `minBox` reserves height in image mode so the
// lettering (cake + title + underline) fits before, or instead of, the art.
const SIZE = {
  // 12rem fits the tallest hero stack (64px cake + 74px title + underline ≈ 182px).
  hero: { min: 51, max: 74, floor: 24, minBox: '12rem' },
  section: { min: 39, max: 53, floor: 20, minBox: '9rem' },
} as const

// Shrinks the title to the container (cqi) so it stays on one line before it
// would ever wrap. The cap-width factor lives with the font in graffitiFont.ts.
const GLYPH_EM = GRAFFITI_CAP_WIDTH_EM

function titleFontSize(size: 'hero' | 'section', title: string): string {
  const s = SIZE[size]
  const slope = ((s.max - s.min) / 70) * 100 // px per 100vw between 360 and 430
  const viewportScale = `clamp(${s.min}px, calc(${s.min}px + (100vw - 360px) * ${(slope / 100).toFixed(4)}), ${s.max}px)`
  const fit = `${(100 / (Math.max(title.length, 4) * GLYPH_EM)).toFixed(2)}cqi`
  // Never bigger than the brief's size, shrink to fit, but not below a readable floor
  // (past that, wrapping to two tight lines is the last resort).
  return `max(${s.floor}px, min(${viewportScale}, ${fit}))`
}

// Two thin black offsets (≤ 1px blur) keep the brush strokes crisp.
const PAINT_SHADOW = '0 2px 0 #000, 0 3px 1px rgba(0,0,0,0.6)'

function Underline({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 240 14" preserveAspectRatio="none" className="mx-auto block h-3 w-[70%] max-w-[22rem]">
      <path
        d="M4 9 C40 3, 70 12, 110 7 S180 3, 236 8"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function GraffitiHeader({ title, level, size, theme, badge, imageSrc, className }: GraffitiHeaderProps) {
  const [artShowing, setArtShowing] = useState(false)
  const Heading = level === 1 ? 'h1' : 'h2'
  const colors = theme.graffiti
  const s = SIZE[size]

  const headingStyle: CSSProperties = {
    fontFamily: GRAFFITI_FONT_STACK,
    fontSize: titleFontSize(size, title),
    color: colors.text,
    textShadow: PAINT_SHADOW,
    // Thin black outline drawn behind the mint fill (paint-order), so it sharpens
    // edges without eating into the letters.
    WebkitTextStroke: '1px #000',
    paintOrder: 'stroke fill',
    letterSpacing: '0.01em',
    // Caveat Brush descends ~0.3em below the baseline; this line height plus the
    // bottom padding keeps descenders inside the heading box, clear of the underline.
    lineHeight: 1.1,
    paddingBottom: '0.12em',
    textWrap: 'balance',
    // Slight hand-painted tilt. A transform doesn't change layout width, and at
    // -4deg it adds only ~0.07em of lean, inside the fit headroom.
    transform: 'skewX(-4deg)',
  }

  // The lettering (and its decoration): hidden visually once real art has loaded,
  // but the heading text always stays in the DOM for assistive tech.
  const lettering = (
    <div
      className={cn(
        'relative flex w-full flex-col items-center gap-1 transition-opacity duration-300 motion-reduce:transition-none',
        artShowing && 'opacity-0'
      )}
    >
      {/* 64px cake, with 8px extra space before the title (gap-1 + mb-2). */}
      <CakeIcon accent={theme.accent} accent2={theme.accent2} frosting={colors.text} className="mb-2 h-16 w-16 shrink-0" />
      {/* Mixed case as written in the theme config. */}
      <Heading className={cn('max-w-full text-center break-words', artShowing && 'sr-only')} style={headingStyle}>
        {title}
      </Heading>
      <div aria-hidden="true" className="w-full">
        <Underline color={colors.underline} />
      </div>
    </div>
  )

  return (
    <div
      className={cn(graffitiFont.variable, 'relative w-full max-w-full text-center', className)}
      // Container queries let the title size itself to this box (cqi units).
      style={{ containerType: 'inline-size' }}
    >
      {/* Soft splatter behind the title (CSS only, no element of its own). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] inset-y-0 blur-xl"
        style={{
          background: `radial-gradient(40% 55% at 30% 50%, ${colors.splatter}2e, transparent 70%), radial-gradient(35% 50% at 72% 45%, ${colors.splatter}24, transparent 70%)`,
        }}
      />

      {imageSrc ? (
        // Reserved 3:1 box (art is ~1200×400) so swapping lettering for art never shifts layout.
        // Also a size container, so the title fits the art box rather than the wider column.
        <div
          className="relative mx-auto w-full max-w-[30rem]"
          style={{ aspectRatio: '3 / 1', minHeight: s.minBox, containerType: 'inline-size' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">{lettering}</div>
          <div className="absolute inset-0">
            <ThemedImage
              src={imageSrc}
              width={1200}
              height={400}
              fill
              priority
              fallback={null}
              onLoadedChange={setArtShowing}
            />
          </div>
        </div>
      ) : (
        <div className="relative">{lettering}</div>
      )}

      {badge && <div className="relative mt-3 flex justify-center">{badge}</div>}
    </div>
  )
}
