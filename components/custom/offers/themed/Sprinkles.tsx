'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export type SprinkleArea = 'header' | 'edge' | 'burst' | 'trail'

interface SprinklesProps {
  palette: string[]
  // 'header': a thin full-width strip. 'edge': two clusters hugging the left and
  // right ends of a band (the middle stays clear). 'burst': a ring around the
  // center of a square box (around an illustration). 'trail': a row of capsules,
  // one per equal slot (about one per 18px), fading toward the right; needs `width`
  // and `height` (the box it fills, in px).
  area: SprinkleArea
  count?: number
  // Same seed → same layout on every render (no shifting).
  seed?: number
  // Capsule length in viewBox units.
  size?: number
  // Capsule thickness in viewBox units. Default: a third of `size` (at least 2.5).
  thickness?: number
  // Box size for the 'trail' area.
  width?: number
  height?: number
  className?: string
}

interface Capsule {
  x: number
  y: number
  angle: number
  color: string
  length: number
  opacity?: number
}

// Small deterministic PRNG (mulberry32).
function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

interface Dims {
  width: number
  height: number
}

function layout(
  area: SprinkleArea,
  count: number,
  seed: number,
  size: number,
  palette: string[],
  dims: Dims
): Capsule[] {
  const rand = rng(seed)
  const pick = (i: number) => palette[i % palette.length]
  const capsules: Capsule[] = []
  for (let i = 0; i < count; i++) {
    const length = size * (0.75 + rand() * 0.5)
    if (area === 'header') {
      // 400 × 24 strip: spread evenly with jitter, kept inside the strip.
      const slot = 400 / count
      capsules.push({ x: slot * i + slot * (0.2 + rand() * 0.6), y: 6 + rand() * 12, angle: -60 + rand() * 120, color: pick(i), length })
    } else if (area === 'trail') {
      const { width, height } = dims
      // Stratified: the width is cut into `count` equal slots and each gets exactly one
      // capsule, nudged by at most ±0.2 of a slot. That leaves no big gaps, and the last
      // slot ends at the box's right edge. Every random draw happens in the same order
      // for every capsule, so a given seed + width always looks the same.
      const slot = width / count
      const edge = 7.5 // half the extent of a 14px capsule at any angle: keeps it inside the box
      const x = Math.min(Math.max(slot * (i + 0.5 + (rand() - 0.5) * 0.4), edge), width - edge)
      const y = height / 2 + (rand() - 0.5) * (height - 16)
      const angle = -70 + rand() * 140
      const len = size * (0.85 + rand() * 0.3)
      const t = x / width // 0 at the title, 1 at the right edge
      capsules.push({ x, y, angle, color: pick(i), length: len, opacity: 1 - 0.65 * t })
    } else if (area === 'edge') {
      // 96 × 48 cluster (mirrored by the caller for the right side).
      capsules.push({ x: 8 + rand() * 72, y: 8 + rand() * 32, angle: -70 + rand() * 140, color: pick(i), length })
    } else {
      // 200 × 200 ring around the center, capsules pointing outward.
      const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.4
      const r = 78 + rand() * 18
      capsules.push({
        x: 100 + Math.cos(a) * r,
        y: 100 + Math.sin(a) * r,
        angle: (a * 180) / Math.PI,
        color: pick(i),
        length,
      })
    }
  }
  return capsules
}

function CapsuleShapes({ capsules, thickness }: { capsules: Capsule[]; thickness: number }) {
  return (
    <>
      {capsules.map((c, i) => (
        <rect
          key={i}
          x={c.x - c.length / 2}
          y={c.y - thickness / 2}
          width={c.length}
          height={thickness}
          rx={thickness / 2}
          fill={c.color}
          opacity={c.opacity}
          transform={`rotate(${c.angle.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`}
        />
      ))}
    </>
  )
}

// Decorative SVG sprinkles. Always fills its (relatively positioned) parent, never
// takes pointer events and is hidden from assistive tech. Callers reserve the
// space, so sprinkles never sit on top of text or tap targets.
export function Sprinkles({
  palette,
  area,
  count,
  seed = 1,
  size = 9,
  thickness,
  width = 0,
  height = 0,
  className,
}: SprinklesProps) {
  const n =
    count ??
    (area === 'header' ? 14 : area === 'edge' ? 5 : area === 'trail' ? Math.min(16, Math.round(width / 18)) : 12)
  const stroke = thickness ?? Math.max(2.5, size * 0.32)
  const capsules = useMemo(
    () => layout(area, n, seed, size, palette, { width, height }),
    [area, n, seed, size, palette, width, height]
  )
  // Only a gentle fade-in, and only when the user hasn't asked for reduced motion.
  const fade = 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-700'

  if (area === 'edge') {
    return (
      <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', fade, className)}>
        <svg viewBox="0 0 96 48" className="absolute left-0 top-0 h-full w-24" preserveAspectRatio="xMinYMid meet">
          <CapsuleShapes capsules={capsules} thickness={stroke} />
        </svg>
        <svg viewBox="0 0 96 48" className="absolute right-0 top-0 h-full w-24 -scale-x-100" preserveAspectRatio="xMinYMid meet">
          <CapsuleShapes capsules={capsules} thickness={stroke} />
        </svg>
      </div>
    )
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={area === 'header' ? '0 0 400 24' : area === 'trail' ? `0 0 ${width} ${height}` : '0 0 200 200'}
      preserveAspectRatio={area === 'header' ? 'xMidYMid slice' : area === 'trail' ? 'xMinYMid meet' : 'xMidYMid meet'}
      className={cn('pointer-events-none absolute inset-0 h-full w-full', fade, className)}
    >
      <CapsuleShapes capsules={capsules} thickness={stroke} />
    </svg>
  )
}
