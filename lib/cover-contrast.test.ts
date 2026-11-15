import { describe, expect, it } from 'vitest'
import {
  COVER_SCRIM_ALPHA, COVER_TEXT, ROW_SURFACE, contrastRatio, hexToRgb, underBlackScrim, worstCaseCoverContrast,
} from '@/lib/cover-contrast'

describe('contrast maths', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5)
    expect(contrastRatio(hexToRgb('#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2)
  })

  it('composites under a black scrim', () => {
    expect(underBlackScrim([255, 255, 255], 0.85)).toEqual([38, 38, 38])
  })
})

describe('saved-plan row text meets WCAG AA (4.5:1)', () => {
  for (const [name, hex] of Object.entries(COVER_TEXT)) {
    it(`${name} ${hex} over the worst-case (white) cover pixel under the scrim`, () => {
      expect(worstCaseCoverContrast(hex)).toBeGreaterThanOrEqual(4.5)
    })
    it(`${name} ${hex} over the plain row surface`, () => {
      expect(contrastRatio(hexToRgb(hex), hexToRgb(ROW_SURFACE))).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('the stop card scrim (0.65) alone would not be enough for the secondary text', () => {
    expect(worstCaseCoverContrast(COVER_TEXT.secondary, 0.65)).toBeLessThan(4.5)
    expect(COVER_SCRIM_ALPHA).toBeGreaterThan(0.65)
  })
})
