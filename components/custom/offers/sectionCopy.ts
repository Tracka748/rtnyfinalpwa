// Copy for the wizard section cards (steps 3-7). Edit text here; layout lives in
// SectionCard.tsx. `tip` renders with a 💡 prefix; `example`, when set,
// renders after the tip as "Example: …".

export type SectionKey =
  | 'basics' | 'pricing' | 'included' | 'groupSize' | 'booking' | 'requirements'
  | 'addOns' | 'availability' | 'reach' | 'pitch' | 'photos' | 'preview' | 'checklist' | 'adminReview'

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
  // ── Steps 4-7 ──
  addOns: {
    emoji: '✨',
    intro: 'Optional extras that raise the total booking value.',
    tip: 'No extras? Skip this step.',
  },
  availability: {
    emoji: '📅',
    intro: 'Specialists need to know when they can book you.',
    tip: 'Pick days and times, or choose confirm each booking.',
  },
  reach: {
    emoji: '🗓️',
    intro: 'Block off dates you can’t take birthdays, like holidays or private events.',
    tip: 'Open every week? Skip this card.',
  },
  pitch: {
    emoji: '💬',
    intro: 'A line or two in your own voice. This is what wins the booking.',
    tip: 'Tap a starter, then make it yours.',
  },
  photos: {
    emoji: '📸',
    intro: 'Real photos make your offer feel real. Add a cover and up to 6 more.',
    tip: 'Photos are optional, but offers with photos stand out.',
  },
  preview: {
    emoji: '👀',
    intro: 'This is roughly how Specialists will see your offer.',
    tip: 'Tap Edit on any block to change it.',
  },
  checklist: {
    emoji: '✅',
    intro: 'Everything here needs to be done before we can review your offer.',
    tip: 'Tap a missing item to jump straight to it.',
  },
  adminReview: {
    emoji: '🛡️',
    intro: 'Approve to put this offer live, or send it back with a note for the partner.',
    tip: 'The partner sees your note on their offer.',
  },
}

// Step 6 starter lines, keyed by CategoryConfig.kind. Tapping one fills the pitch box.
export const PITCH_STARTERS: Record<'venue' | 'photo' | 'beauty' | 'transport' | 'default', string[]> = {
  venue: [
    'Perfect for groups who want dinner and entertainment without planning multiple stops.',
    'We handle the table, the dessert and the candles, so the birthday guest just shows up and celebrates.',
    'A private-feeling space for your whole crew, right in the middle of Rochester.',
  ],
  photo: [
    'We capture the candid moments you’ll actually want to look back on.',
    'Relaxed, fun sessions that make everyone look great, even the camera-shy friends.',
    'Edited photos delivered fast, ready to post the same week.',
  ],
  beauty: [
    'Get the whole birthday crew glammed up together before the big night out.',
    'A calm, pampering session that makes the birthday guest feel like the main character.',
    'We come to you, so the party never has to stop.',
  ],
  transport: [
    'Ride to every stop together, with a driver who handles the details.',
    'No parking, no designated driver, no stress. Just celebrate.',
    'Arrive in style and keep the party going between stops.',
  ],
  default: [
    'We make birthdays easy to plan and fun to remember.',
    'Locally owned, Rochester-loved, and ready to celebrate with you.',
    'Everything the birthday group needs, in one easy booking.',
  ],
}
