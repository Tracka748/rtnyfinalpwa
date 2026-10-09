// Copy for the wizard step 3 section cards. Edit text here; layout lives in
// OfferDetailsStep.tsx. `tip` renders with a 💡 prefix; `example`, when set,
// renders after the tip as "Example: …".

export type SectionKey = 'basics' | 'pricing' | 'included' | 'groupSize' | 'booking' | 'requirements'

export interface SectionCopy {
  emoji: string
  intro: string
  tip: string
  example?: string
}

export const SECTION_COPY: Record<SectionKey, SectionCopy> = {
  basics: {
    emoji: '🎂',
    intro: 'This is the first thing planners see, so make it sound like a celebration.',
    tip: 'Short and specific beats long and fancy.',
    example: 'Birthday Section 1/2 off.',
  },
  pricing: {
    emoji: '💰',
    intro: 'A clear price is what gets your offer picked when Specialists compare.',
    tip: 'Not sure? Starting at is a safe choice.',
  },
  included: {
    emoji: '🎁',
    intro: 'Tap everything the birthday group gets. This is what makes your offer easy to sell.',
    tip: 'Pick at least one to submit.',
  },
  groupSize: {
    emoji: '👥',
    intro: 'Specialists match offers to party sizes, so this decides which birthdays you show up for.',
    tip: 'Maximum is needed to submit. Skip the minimum if unsure.',
  },
  booking: {
    emoji: '⏱️',
    intro: 'Tell us how long it runs and how much notice you need, so we only send bookings that work.',
    tip: "Choose I'll confirm availability if it changes week to week.",
  },
  requirements: {
    emoji: '📋',
    intro: 'A few details that save guests and Specialists from asking later.',
    tip: "Skip anything that doesn't apply.",
  },
}
