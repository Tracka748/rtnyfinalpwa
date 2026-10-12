// Copy for the wizard section cards (steps 3-7). Edit text here; layout lives in
// SectionCard.tsx. `tip` renders with a 💡 prefix; `example`, when set,
// renders after the tip as "Example: …".

export type SectionKey =
  | 'basics' | 'pricing' | 'included' | 'groupSize' | 'booking' | 'requirements'
  | 'perkType' | 'perkAppliesTo' | 'perkEligible' | 'perkLimit' | 'perkSummary'
  | 'addOns' | 'availability' | 'reach' | 'pitch' | 'photos' | 'preview' | 'checklist' | 'adminReview'

export interface SectionCopy {
  intro: string
  tip: string
  example?: string
}

export const SECTION_COPY: Record<SectionKey, SectionCopy> = {
  basics: {
    intro: 'This is the first thing planners see, so make it sound like a celebration.',
    tip: 'Short and specific beats long and fancy.',
    example: 'Birthday Section 1/2 off.',
  },
  pricing: {
    intro: 'A clear price is what gets your offer picked when Specialists compare.',
    tip: 'Not sure? Starting at is a safe choice.',
  },
  included: {
    intro: 'Tap everything the birthday group gets. This is what makes your offer easy to sell.',
    tip: 'Pick at least one to submit.',
  },
  groupSize: {
    intro: 'Specialists match offers to party sizes, so this decides which birthdays you show up for.',
    tip: 'Maximum is needed to submit. Skip the minimum if unsure.',
  },
  booking: {
    intro: 'Tell us how long it runs and how much notice you need, so we only send bookings that work.',
    tip: "Choose I'll confirm availability if it changes week to week.",
  },
  requirements: {
    intro: 'A few details that save guests and Specialists from asking later.',
    tip: "Skip anything that doesn't apply.",
  },
  // ── Step 3: Birthday perks ──
  perkType: {
    intro: 'Pick the kind of birthday perk you’ll offer.',
    tip: 'You can fine-tune the wording on the next step.',
  },
  perkAppliesTo: {
    intro: 'What the birthday perk is for.',
    tip: 'Pick everything that applies.',
  },
  perkEligible: {
    intro: 'Who can use this perk.',
    tip: 'Choose every group you’d happily welcome.',
  },
  perkLimit: {
    intro: 'Tell us how many birthday redemptions you can handle each month. Specialists use this to know when you are full.',
    tip: 'Not sure? Confirm each request keeps you in control.',
  },
  // Step 4 summary card (replaces the pricing card while using birthday perks).
  perkSummary: {
    intro: 'Built from your birthday perk answers.',
    tip: 'Need a regular price instead? Switch to a fixed price below.',
  },
  // ── Steps 5-8 ──
  addOns: {
    intro: 'Optional extras that raise the total booking value.',
    tip: 'No extras? Skip this step.',
  },
  availability: {
    intro: 'Specialists need to know when they can book you.',
    tip: 'Pick days and times, or choose confirm each booking.',
  },
  reach: {
    intro: 'Block off dates you can’t take birthdays, like holidays or private events.',
    tip: 'Open every week? Skip this card.',
  },
  pitch: {
    intro: 'A line or two in your own voice. This is what wins the booking.',
    tip: 'Tap a starter, then make it yours.',
  },
  photos: {
    intro: 'Real photos make your offer feel real. Add a cover and up to 6 more.',
    tip: 'Photos are optional, but offers with photos stand out.',
  },
  preview: {
    intro: 'This is roughly how Specialists will see your offer.',
    tip: 'Tap Edit on any block to change it.',
  },
  checklist: {
    intro: 'Everything here needs to be done before we can review your offer.',
    tip: 'Tap a missing item to jump straight to it.',
  },
  adminReview: {
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

// ─── Step 3: Birthday perks ──────────────────────────────────────────────────

export const PERKS_STEP_COPY = {
  eyebrow: 'RTNY · Birthday Partner',
  headline: 'What birthday perks can you offer?',
  subline: 'Choose the benefits your business is willing to provide. We’ll build your offer from your answers.',
  continueLabel: 'Continue to offer details →',
  sections: {
    offerType: { title: '1. Offer type', question: 'What kind of birthday benefit do you provide?' },
    appliesTo: { title: '2. What does it apply to?', question: 'Select all that apply.' },
    eligible: { title: '3. Who is eligible?', question: 'Who receives the birthday benefit?' },
    monthly: {
      title: '4. Monthly offer limit',
      question: 'How many birthday redemptions can your business accommodate each month?',
      alternatives: 'Or choose unlimited, set a custom limit, or confirm availability individually.',
    },
  },
  // Shown on the perks step when the offer uses a fixed price instead.
  fixedPriceNote: 'You’re using a fixed price, so offer type is optional. Picking one switches you back to birthday perks.',
}

export const FINE_TUNE_COPY = {
  headline: 'Fine-tune your offer',
  body: 'This is what birthday planners will see.',
  autoNote: 'We filled this in from your answers. Change anything you like.',
  switchToFixed: 'Switch to a fixed price',
  switchToPerks: 'Use birthday perks instead',
  // Tag on "What's included" entries generated from the perks step answers.
  fromAnswersTag: 'From your answers',
  // Shown under a min/max guest group when the min/max rule disables some chips.
  guestRuleHint: 'Maximum must be at least your minimum.',
}

// Option labels for the perks step. Values are what gets saved in details.
export const PERK_OPTIONS = {
  offerTypes: [
    { value: 'free', label: 'Free', subline: 'Complimentary item or service' },
    { value: 'discount', label: 'Discount', subline: 'Percentage or dollar amount off' },
    { value: 'bogo', label: 'BOGO', subline: 'Buy one, get one' },
    { value: 'perk', label: 'Special perk', subline: 'Birthday upgrade, gift or bonus' },
  ],
  discountTypes: [
    { value: 'percent', label: 'Percent off' },
    { value: 'dollar', label: 'Dollar amount off' },
  ],
  appliesTo: [
    { value: 'item', label: 'Item / product' },
    { value: 'service', label: 'Service / activity' },
    { value: 'space', label: 'Space / venue' },
    { value: 'admission', label: 'Admission / event' },
    { value: 'entire_order', label: 'Entire order' },
  ],
  eligible: [
    { value: 'birthday_person', label: 'Birthday person', subline: 'The person celebrating' },
    { value: 'birthday_crew', label: 'Birthday crew', subline: 'Friends and guests celebrating together' },
    { value: 'couples', label: 'Couples', subline: 'A birthday date or two-person experience' },
    { value: 'family', label: 'Family', subline: 'Family-friendly celebrations' },
  ],
  monthly: {
    perMonth: 'per month',
    unlimited: 'Unlimited',
    custom: 'Custom',
    customLabel: 'How many per month?',
    confirmEach: 'Confirm each request',
  },
} as const
