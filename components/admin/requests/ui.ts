// Shared readability classes for the request inbox pages and the staff shell, defined once.
// See docs/READABILITY_CHECKLIST.md. The numbers are WCAG 2.x contrast ratios against the three surfaces
// these pages use (page #121113, card #1a1a1a, sheet #1a1819).

/** Boundary of an interactive control (input, select, outline button): white/40 is about 3.8:1 (needs 3:1). */
export const CONTROL_BORDER = 'border-white/40'

/** Decorative surface borders (cards, banners, dividers). Not for controls. */
export const CARD_BORDER = 'border-white/10'

/** Visible keyboard focus: a solid mint ring, about 14:1 on the page background. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59FFA0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121113]'

/** Minimum tap target height. */
export const TAP = 'min-h-[44px]'

/** Body text at least 16px with a 1.5 line height; secondary text at least 14px. */
export const BODY = 'text-base leading-6'
export const SECONDARY = 'text-sm leading-5'

/** Longest comfortable line for free text (notes, reasons, timeline). */
export const PROSE = 'max-w-prose'
