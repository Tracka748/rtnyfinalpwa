// Inline SVG stand-ins for the optional campaign images, so every themed screen
// renders with no files in public/campaigns/. All are decorative (aria-hidden),
// contain no text, and scale to their reserved box.

interface ArtProps {
  accent: string
  accent2: string
  className?: string
}

const svgProps = { 'aria-hidden': true, focusable: false } as const

export function PartyHatSvg({ accent, accent2, className }: ArtProps) {
  return (
    <svg {...svgProps} viewBox="0 0 64 64" className={className}>
      <path d="M32 6 L52 56 H12 Z" fill={accent} />
      <path d="M22 31 L42 31 M17 44 L47 44" stroke={accent2} strokeWidth="4" strokeLinecap="round" />
      <path d="M12 56 H52" stroke="#F9FDFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="6" r="5" fill={accent2} />
    </svg>
  )
}

export function BalloonsSvg({ accent, accent2, className }: ArtProps) {
  return (
    <svg {...svgProps} viewBox="0 0 160 160" className={className}>
      <path d="M58 92 Q62 120 72 148 M102 86 Q96 118 84 148 M80 98 L78 148" stroke="#F9FDFF" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <ellipse cx="56" cy="62" rx="24" ry="30" fill={accent} />
      <ellipse cx="104" cy="56" rx="24" ry="30" fill={accent2} />
      <ellipse cx="80" cy="72" rx="22" ry="28" fill="#59FFA0" />
      <path d="M52 90 L56 98 L60 90 Z M100 84 L104 92 L108 84 Z M76 98 L80 105 L84 98 Z" fill="#F9FDFF" fillOpacity="0.7" />
      <ellipse cx="48" cy="50" rx="5" ry="8" fill="#F9FDFF" fillOpacity="0.35" />
      <ellipse cx="96" cy="44" rx="5" ry="8" fill="#F9FDFF" fillOpacity="0.35" />
    </svg>
  )
}

export function ConfettiDotsSvg({ accent, accent2, className }: ArtProps) {
  const dots: [number, number, number, string][] = [
    [20, 30, 4, accent], [140, 26, 5, accent2], [34, 120, 5, '#59FFA0'], [128, 128, 4, accent],
    [80, 14, 3, '#F9FDFF'], [12, 80, 3, accent2], [150, 84, 3, '#59FFA0'], [96, 148, 4, accent2],
  ]
  return (
    <svg {...svgProps} viewBox="0 0 160 160" className={className}>
      {dots.map(([cx, cy, r, fill], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </svg>
  )
}

// Success illustration fallback: a party hat with confetti around it.
export function CelebrationSvg({ accent, accent2, className }: ArtProps) {
  return (
    <svg {...svgProps} viewBox="0 0 160 160" className={className}>
      <g transform="translate(40 30) scale(1.25)">
        <path d="M32 6 L52 56 H12 Z" fill={accent} />
        <path d="M22 31 L42 31 M17 44 L47 44" stroke={accent2} strokeWidth="4" strokeLinecap="round" />
        <path d="M12 56 H52" stroke="#F9FDFF" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="6" r="5" fill={accent2} />
      </g>
      <circle cx="24" cy="40" r="4" fill={accent2} />
      <circle cx="138" cy="48" r="5" fill="#59FFA0" />
      <circle cx="30" cy="124" r="4" fill="#59FFA0" />
      <circle cx="132" cy="122" r="4" fill={accent} />
      <circle cx="80" cy="150" r="3" fill="#F9FDFF" />
    </svg>
  )
}

// Thin streamer strip (stand-in for divider.webp).
export function StreamerStripSvg({ accent, accent2, className }: ArtProps) {
  return (
    <svg {...svgProps} viewBox="0 0 400 20" preserveAspectRatio="none" className={className}>
      <path d="M0 10 Q25 2 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10" stroke={accent} strokeWidth="2.5" fill="none" />
      <path d="M0 12 Q25 18 50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12" stroke={accent2} strokeWidth="2" fill="none" strokeOpacity="0.8" />
    </svg>
  )
}
