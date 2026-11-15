// Text over a business cover photo on saved-plan rows (SavedDayPlans). The photo is unknown, so
// contrast is computed for the worst case: a pure white pixel under the scrim (any real pixel is
// darker, and the stop-card treatment also applies brightness(0.75), which is ignored here so the
// numbers stay conservative). WCAG 2.x relative luminance and contrast ratio.

/** Opacity of the solid black scrim over the cover. The stop card uses 0.65 plus a vignette. */
export const COVER_SCRIM_ALPHA = 0.85

/** Every text colour used on a saved-plan row. Each must reach 4.5:1 over the scrim and the card. */
export const COVER_TEXT = {
  primary: '#F9FDFF',   // stop name
  secondary: '#C8C8C8', // time, category and address (lighter than the old #A0A0A0 for margin)
  spend: '#59FFA0',     // estimated spend
} as const

/** Card colour of a row with no cover (the stop card's surface). */
export const ROW_SURFACE = '#1A1819'

type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error('bad hex ' + hex)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Colour of `under` seen through a black layer of the given opacity (sRGB alpha compositing). */
export function underBlackScrim(under: RGB, alpha: number): RGB {
  return under.map(c => Math.round(c * (1 - alpha))) as RGB
}

/** Contrast of a text colour over the worst case (white) cover pixel under the scrim. */
export function worstCaseCoverContrast(textHex: string, alpha = COVER_SCRIM_ALPHA): number {
  return contrastRatio(hexToRgb(textHex), underBlackScrim([255, 255, 255], alpha))
}
