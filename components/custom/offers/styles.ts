import { cn } from '@/lib/utils'

// ─── Type tokens (birthday offer wizard) ─────────────────────────────────────
// Rokkitt = font-header, Rubik = font-sans/font-label. Helper text uses
// white/60 or lighter, which is ~6.9:1 on the #1a1a1a cards (WCAG AA 4.5:1).

// Step 3 question labels (Offer name, How is it priced?, …). Pale mint #B8F5DC is
// ~14:1 on #1a1a1a: softer than the #59FFA0 section headings and selected chips,
// and set apart from #F9FDFF chip text by weight and the chips' pill borders.
// Errors use red-500 borders, red-400 text and an alert icon.
export const LABEL_COLOR = 'text-[#B8F5DC]'

export const text = {
  pageTitle: 'font-header text-[28px] sm:text-[30px] font-bold leading-tight text-white',
  cardHeading: 'font-header text-[22px] font-bold leading-snug text-white',
  fieldLabel: 'font-sans text-base font-semibold text-white',
  questionLabel: `font-sans text-base font-semibold ${LABEL_COLOR}`,
  body: 'font-sans text-base leading-relaxed text-white/75',
  helper: 'font-sans text-sm text-white/60',
  neededTag: 'font-label text-xs font-semibold uppercase tracking-wider text-[#1AC8ED]',
  eyebrow: 'font-label text-xs font-semibold uppercase tracking-wider',
  error: 'font-sans text-sm text-red-400',
  // Step 3 section cards: intro under the heading, then a cyan 💡 tip.
  sectionIntro: 'font-sans text-[15px] leading-relaxed text-white/75',
  sectionTip: 'font-sans text-sm text-[#1AC8ED]',
} as const

// Step 3 section cards: mint heading (~13:1 on #1a1a1a) and a faint mint border.
export const sectionCard = {
  heading: 'text-[#59FFA0]',
  border: 'border-[#59FFA0]/20',
} as const

// ─── Spacing tokens ──────────────────────────────────────────────────────────

export const space = {
  // Between fields inside a card (was space-y-5).
  fields: 'space-y-7',
  // Between a field's label, control and helper text.
  field: 'space-y-2',
  // Between cards/sections on a step.
  sections: 'space-y-6',
  // Between chips, horizontally and between wrapped rows.
  chips: 'gap-3',
  // Clearance so the fixed StickyActionBar never covers the last field
  // (bar is ~76px, ~136px with the secondary button, plus the safe-area inset).
  barClearance: 'pb-[calc(13rem+env(safe-area-inset-bottom))]',
} as const

// ─── Controls ────────────────────────────────────────────────────────────────

// Dark input style shared with app/profile/partner/edit/page.tsx, sized for touch
// (min 48px tall, 16px text so iOS doesn't zoom on focus).
export function inputClass(hasError?: boolean, extra?: string) {
  return cn(
    'w-full min-w-0 min-h-12 bg-white/5 border rounded-lg px-4 py-3 text-base text-white font-sans',
    'placeholder:text-white/40 focus:outline-none transition-colors',
    hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-[#59FFA0]/50',
    extra
  )
}

export function chipClass(selected: boolean) {
  return cn(
    'min-h-[52px] px-5 rounded-full border font-sans text-base font-medium text-left transition-all',
    'disabled:opacity-35 disabled:cursor-not-allowed max-w-full break-words',
    selected
      ? 'bg-[#59FFA0]/20 border-[#59FFA0] text-[#59FFA0]'
      : 'border-white/25 text-[#F9FDFF] hover:border-white/50'
  )
}

// Chip groups aren't inputs, so an invalid group gets a red outline instead of a
// border. Outlines don't take up space, so spacing is unchanged.
export const groupErrorClass = 'rounded-2xl outline outline-1 outline-offset-[6px] outline-red-500/60'

export const cardClass = 'bg-[#1a1a1a] border border-white/10 rounded-2xl'

export const priceFontClass = 'font-[family-name:var(--font-playfair)]'

// ─── Birthday perks step (reference design) ──────────────────────────────────
// One dark surface with divider-separated sections, grey question lines and a
// dark-green selected state. Hex values are exported for reuse; the class strings
// below repeat them literally because Tailwind only picks up literal class names.
// Contrast on #121113: muted text ~10.8:1, mint ~15:1, white ~18:1.

export const PERKS_SURFACE = '#121113'
export const PERKS_SELECTED_BG = '#1D2B24'
export const PERKS_MUTED_TEXT = '#C4C4C8'

const perksFocus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59FFA0]'

export const perks = {
  container: 'bg-[#121113] border border-white/10 rounded-2xl px-4 py-6 sm:px-6',
  divider: 'border-t border-white/[0.12]',
  eyebrow: 'font-label text-sm font-semibold uppercase tracking-[0.12em] text-[#59FFA0]',
  headline: 'font-header text-[30px] font-bold leading-[1.15] text-white',
  subline: 'font-sans text-base sm:text-[17px] leading-relaxed text-[#C4C4C8]',
  sectionTitle: 'font-header text-2xl font-bold leading-tight text-white',
  question: 'font-sans text-base leading-relaxed text-[#C4C4C8]',
  sublineSmall: 'font-sans text-base leading-snug text-[#C4C4C8]',
  // Offer-type / eligible / monthly tiles.
  card(selected: boolean) {
    return cn(
      'w-full min-h-12 rounded-2xl border p-4 text-left transition-colors',
      perksFocus,
      selected ? 'bg-[#1D2B24] border-[#59FFA0]' : 'bg-[#121113] border-white/15 hover:border-white/30'
    )
  },
  icon(selected: boolean) {
    return cn('w-6 h-6 shrink-0', selected ? 'text-[#59FFA0]' : 'text-white')
  },
  // Pill chips (applies to, discount type, monthly alternatives).
  chip(selected: boolean) {
    return cn(
      'min-h-12 px-4 rounded-full border font-sans text-base font-medium transition-colors max-w-full break-words',
      perksFocus,
      selected ? 'bg-[#1D2B24] border-[#59FFA0] text-[#59FFA0]' : 'bg-transparent border-white/20 text-white hover:border-white/40'
    )
  },
} as const
