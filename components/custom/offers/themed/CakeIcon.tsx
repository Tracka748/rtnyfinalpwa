// Two-tier birthday cake in the flat paint-marker style: thin black outlines, no
// texture, no letters. Decorative only. Pink, baby blue and mint come from the
// theme; cream, gold and orange are fixed cake colors.

export const CAKE_CREAM = '#FFF4E0'
export const CAKE_GOLD = '#FFC83D'
export const CAKE_FLAME_CORE = '#FF7A45'
const PLATE = '#F9FDFF'
const OUTLINE = '#000'

interface CakeIconProps {
  // Theme accent (pink zigzag stripe).
  accent: string
  // Theme accent2 (top tier, candles).
  accent2: string
  // Frosting color (mint).
  frosting?: string
  className?: string
}

// Frosting band across the top of a tier: straight top edge, scalloped bottom.
function frostingPath(x: number, y: number, width: number, scallops: number) {
  const r = width / scallops / 2
  let d = `M${x} ${y} h${width} v1.6`
  for (let i = 0; i < scallops; i++) d += ` a${r} ${r} 0 0 1 ${-2 * r} 0`
  return `${d} Z`
}

function zigzag(x1: number, x2: number, y: number, amp: number, steps: number) {
  const step = (x2 - x1) / steps
  return Array.from({ length: steps + 1 }, (_, i) => `${(x1 + step * i).toFixed(2)},${i % 2 ? y - amp : y}`).join(' ')
}

const CANDLES = [15.4, 20.8, 26.2, 31.6]

// The cake drawing on a 48 × 48 grid, as a <g> so other SVGs (e.g. the success
// illustration fallback) can place it with a transform.
export function CakeShapes({ accent, accent2, frosting = '#59FFA0' }: Omit<CakeIconProps, 'className'>) {
  return (
      <g stroke={OUTLINE} strokeWidth="1.1" strokeLinejoin="round">
        {/* Candles, alternating baby blue and cream, with gold flames and orange cores */}
        {CANDLES.map((x, i) => (
          <g key={x}>
            <rect x={x} y="11" width="2.4" height="7.5" rx="0.6" fill={i % 2 ? CAKE_CREAM : accent2} />
            <path
              d={`M${x + 1.2} 4.6 C${x + 3.3} 7.2 ${x + 2.9} 10.4 ${x + 1.2} 10.7 C${x - 0.5} 10.4 ${x - 0.9} 7.2 ${x + 1.2} 4.6 Z`}
              fill={CAKE_GOLD}
              strokeWidth="0.8"
            />
            <ellipse cx={x + 1.2} cy="8.9" rx="0.75" ry="1.25" fill={CAKE_FLAME_CORE} stroke="none" />
          </g>
        ))}

        {/* Top tier: baby blue with a pink zigzag stripe */}
        <rect x="12" y="18" width="24" height="11" rx="2" fill={accent2} />
        <polyline points={zigzag(13.2, 34.8, 25.2, 2.2, 8)} fill="none" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
        <path d={frostingPath(12, 17.4, 24, 6)} fill={frosting} />

        {/* Bottom tier: cream */}
        <rect x="7" y="29" width="34" height="12.5" rx="2" fill={CAKE_CREAM} />
        <path d={frostingPath(7, 28.4, 34, 8)} fill={frosting} />

        {/* Slim plate */}
        <rect x="3.5" y="41.5" width="41" height="3" rx="1.5" fill={PLATE} />
      </g>
  )
}

export function CakeIcon({ accent, accent2, frosting, className }: CakeIconProps) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" className={className}>
      <CakeShapes accent={accent} accent2={accent2} frosting={frosting} />
    </svg>
  )
}
