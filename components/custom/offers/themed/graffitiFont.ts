import { Caveat_Brush } from 'next/font/google'

// The graffiti header font. To swap (e.g. Permanent Marker or Knewave), change this
// name, the import above and the loader call below. next/font requires the loader
// to be called directly by its imported name, so the call can't read this string.
export const GRAFFITI_FONT_NAME = 'Caveat Brush'

// Used only inside GraffitiHeader: the class sets --font-graffiti on that subtree,
// so global fonts are untouched.
export const graffitiFont = Caveat_Brush({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-graffiti',
})

export const GRAFFITI_FONT_STACK =
  'var(--font-graffiti), "Permanent Marker", var(--font-rokkitt), Rokkitt, system-ui, sans-serif'

// Average advance width per character in em, measured from the font file for the
// mixed-case titles (Caveat Brush: "Birthday Partner" 0.388em/char, "Preview"
// 0.395em, incl. spaces and 0.01em tracking), plus ~10% headroom for the stroke
// and skew. GraffitiHeader uses it to shrink titles to one line. Re-measure if the
// font changes (Sedgwick Ave Display caps needed 0.60).
export const GRAFFITI_CAP_WIDTH_EM = 0.43
