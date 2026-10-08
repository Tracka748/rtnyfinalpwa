// Category-driven structure for wizard step 3. Partners pick from options;
// answers land in existing columns (`includes`) or in vendor_services.details,
// which the offers API limits to <= 20 keys with string (<= 500 chars), number,
// or string-list (<= 12 items, <= 50 chars each) values.

export interface ChipOption {
  value: string
  label: string
  // Selecting this option deselects these values (e.g. "All ages" vs "21+").
  excludes?: string[]
}

export interface NumberOption {
  value: number
  label: string
}

export type RequirementField =
  | { key: string; label: string; kind: 'money'; hint?: string }
  | { key: string; label: string; kind: 'number'; options: NumberOption[] }
  | { key: string; label: string; kind: 'choice'; options: ChipOption[] }
  | { key: string; label: string; kind: 'multi'; options: ChipOption[] }
  | { key: string; label: string; kind: 'note'; maxLength: number; placeholder?: string }

export interface CategoryConfig {
  // Preset "What's included" chips, saved as their labels in `includes`.
  includePresets: string[]
  // "Additional requirements" section; null when the category has none.
  requirements: { heading: string; fields: RequirementField[] } | null
}

// ─── Venues (incl. Restaurant & Catering) ────────────────────────────────────

const VENUE: CategoryConfig = {
  includePresets: [
    'Birthday meal', 'Birthday dessert', 'Birthday drink', 'Reserved table', 'Private space',
    'Decorations', 'Birthday cake', 'Entertainment', 'Photography', 'Gift/perk', 'Discount',
  ],
  requirements: {
    heading: 'Additional requirements',
    fields: [
      { key: 'deposit', label: 'Deposit to book', kind: 'money', hint: 'Leave blank if you don’t take a deposit.' },
      {
        key: 'age_requirements',
        label: 'Age requirements',
        kind: 'multi',
        options: [
          { value: 'all_ages', label: 'All ages', excludes: ['18_plus', '21_plus'] },
          { value: '18_plus', label: '18+', excludes: ['all_ages', '21_plus'] },
          { value: '21_plus', label: '21+', excludes: ['all_ages', '18_plus'] },
          { value: 'children_accompanied', label: 'Children must be accompanied' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'food_drink',
        label: 'Food & drink',
        kind: 'multi',
        options: [
          { value: 'food_included', label: 'Food included' },
          { value: 'drinks_included', label: 'Drinks included' },
          { value: 'alcohol_available', label: 'Alcohol available' },
          { value: 'outside_food_allowed', label: 'Outside food allowed', excludes: ['no_outside_food_drinks'] },
          { value: 'outside_drinks_allowed', label: 'Outside drinks allowed', excludes: ['no_outside_food_drinks'] },
          {
            value: 'no_outside_food_drinks',
            label: 'No outside food or drinks',
            excludes: ['outside_food_allowed', 'outside_drinks_allowed'],
          },
        ],
      },
      {
        key: 'venue_note',
        label: 'Anything else guests should know?',
        kind: 'note',
        maxLength: 200,
        placeholder: 'e.g. Cake fee applies for outside cakes',
      },
    ],
  },
}

// ─── Photographer / Videographer ─────────────────────────────────────────────

const PHOTO_VIDEO: CategoryConfig = {
  includePresets: ['Edited photos', 'Raw files', 'Online gallery', 'Prints', 'Second shooter'],
  requirements: {
    heading: 'Additional requirements',
    fields: [
      {
        key: 'session_minutes',
        label: 'Session length',
        kind: 'number',
        options: [
          { value: 30, label: '30 min' },
          { value: 60, label: '1 hour' },
          { value: 90, label: '1.5 hours' },
          { value: 120, label: '2 hours' },
          { value: 180, label: '3 hours' },
          { value: 240, label: '4+ hours' },
        ],
      },
      {
        key: 'edited_photos',
        label: 'Edited photos',
        kind: 'number',
        options: [
          { value: 10, label: '10' },
          { value: 25, label: '25' },
          { value: 50, label: '50' },
          { value: 100, label: '100' },
          { value: 200, label: '200' },
          { value: 300, label: '300+' },
        ],
      },
      {
        key: 'delivery_days',
        label: 'Delivery time',
        kind: 'number',
        options: [
          { value: 3, label: '3 days' },
          { value: 7, label: '1 week' },
          { value: 14, label: '2 weeks' },
          { value: 21, label: '3 weeks' },
          { value: 30, label: '4+ weeks' },
        ],
      },
      {
        key: 'location_type',
        label: 'Location',
        kind: 'choice',
        options: [
          { value: 'mobile', label: 'We come to you' },
          { value: 'in-studio', label: 'In studio' },
        ],
      },
    ],
  },
}

// ─── Beauty / Fitness and Wellness ───────────────────────────────────────────

const BEAUTY_WELLNESS: CategoryConfig = {
  includePresets: ['Service for birthday guest', 'Group package', 'Refreshments', 'Gift/perk', 'Discount'],
  requirements: {
    heading: 'Additional requirements',
    fields: [
      {
        key: 'service_format',
        label: 'Format',
        kind: 'choice',
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'group', label: 'Group' },
        ],
      },
      {
        key: 'clients',
        label: 'Number of clients',
        kind: 'number',
        options: [1, 2, 3, 4, 5, 6, 8, 10, 15].map((n) => ({ value: n, label: String(n) })).concat({ value: 20, label: '20+' }),
      },
      {
        key: 'location_type',
        label: 'Location',
        kind: 'choice',
        options: [
          { value: 'mobile', label: 'We come to you' },
          { value: 'in-location', label: 'At our location' },
        ],
      },
      {
        key: 'appointment_minutes',
        label: 'Appointment length',
        kind: 'number',
        options: [
          { value: 30, label: '30 min' },
          { value: 45, label: '45 min' },
          { value: 60, label: '1 hour' },
          { value: 90, label: '1.5 hours' },
          { value: 120, label: '2 hours' },
          { value: 180, label: '3+ hours' },
        ],
      },
    ],
  },
}

// ─── Transportation ──────────────────────────────────────────────────────────

const TRANSPORTATION: CategoryConfig = {
  includePresets: ['Round trip', 'Driver', 'Refreshments', 'Decorations'],
  requirements: {
    heading: 'Additional requirements',
    fields: [
      {
        key: 'passenger_capacity',
        label: 'Passenger capacity',
        kind: 'number',
        options: [4, 6, 8, 10, 14, 20, 30].map((n) => ({ value: n, label: String(n) })).concat({ value: 50, label: '50+' }),
      },
      {
        key: 'service_areas',
        label: 'Service area',
        kind: 'multi',
        options: [
          { value: 'rochester_city', label: 'Rochester city' },
          { value: 'monroe_county', label: 'Monroe County' },
          { value: 'greater_rochester', label: 'Greater Rochester' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'vehicle_types',
        label: 'Vehicle type',
        kind: 'multi',
        options: [
          { value: 'sedan', label: 'Sedan' },
          { value: 'suv', label: 'SUV' },
          { value: 'stretch_limo', label: 'Stretch limo' },
          { value: 'party_bus', label: 'Party bus' },
          { value: 'sprinter_van', label: 'Sprinter van' },
          { value: 'shuttle_bus', label: 'Shuttle bus' },
        ],
      },
      {
        key: 'pickup_requirements',
        label: 'Pickup requirements',
        kind: 'multi',
        options: [
          { value: 'single_pickup', label: 'One pickup location', excludes: ['multiple_stops'] },
          { value: 'multiple_stops', label: 'Multiple stops OK', excludes: ['single_pickup'] },
          { value: 'minimum_hours', label: 'Minimum booking time' },
          { value: 'no_alcohol', label: 'No alcohol on board', excludes: ['alcohol_21_plus'] },
          { value: 'alcohol_21_plus', label: 'Alcohol OK (21+)', excludes: ['no_alcohol'] },
        ],
      },
    ],
  },
}

const DEFAULT_CONFIG: CategoryConfig = {
  includePresets: ['Gift/perk', 'Discount', 'Decorations', 'Refreshments'],
  requirements: null,
}

// Keyed on lower-cased partner_categories.name.
const CATEGORY_LOOKUP: Record<string, CategoryConfig> = {
  'live music venue': VENUE,
  'banquet hall': VENUE,
  'restaurant / bar': VENUE,
  'restaurant & catering': VENUE,
  'rooftop': VENUE,
  'outdoor space': VENUE,
  'community center': VENUE,
  'hotel / event space': VENUE,
  'warehouse / industrial': VENUE,
  'other venue': VENUE,
  'photographer': PHOTO_VIDEO,
  'videographer': PHOTO_VIDEO,
  'beauty': BEAUTY_WELLNESS,
  'fitness and wellness': BEAUTY_WELLNESS,
  'transportation': TRANSPORTATION,
}

export function configForCategory(categoryName: string | null | undefined): CategoryConfig {
  if (!categoryName) return DEFAULT_CONFIG
  return CATEGORY_LOOKUP[categoryName.trim().toLowerCase()] ?? DEFAULT_CONFIG
}

// Free-text details written by the first version of step 3. They are never
// deleted; the wizard shows them read-only as "Earlier notes".
export const LEGACY_NOTE_KEYS: Record<string, string> = {
  catering_rules: 'Food & drink rules',
  private_event_availability: 'Private party availability',
  service_area: 'Service area',
  vehicle_type: 'Vehicle type',
}

// ─── Booking (shared by all categories) ──────────────────────────────────────
// Each chip maps to a column value; the chip label is also saved in details
// (duration_label / notice_label) so the same chip re-selects on reopen.

export const DURATION_OPTIONS: { label: string; hours: number | null }[] = [
  { label: 'Under 1 hour', hours: 0.5 },
  { label: '1-2 hours', hours: 1.5 },
  { label: '2-3 hours', hours: 2.5 },
  { label: '3-4 hours', hours: 3.5 },
  { label: 'Half day', hours: 5 },
  { label: 'Full day', hours: 8 },
  { label: 'Flexible', hours: null },
]

export const NOTICE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: 'Same day', hours: 0 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2+ weeks', hours: 336 },
  { label: 'I’ll confirm availability', hours: null },
]

// Best chip for an offer saved before labels existed.
export function durationLabelForHours(hours: number | null | undefined): string | null {
  if (hours == null) return null
  if (hours < 1) return 'Under 1 hour'
  if (hours <= 2) return '1-2 hours'
  if (hours <= 3) return '2-3 hours'
  if (hours <= 4) return '3-4 hours'
  if (hours <= 6) return 'Half day'
  return 'Full day'
}

export function noticeLabelForHours(hours: number | null | undefined): string | null {
  if (hours == null) return null
  if (hours <= 0) return 'Same day'
  if (hours <= 24) return '24 hours'
  if (hours <= 48) return '48 hours'
  if (hours <= 72) return '3 days'
  if (hours <= 168) return '1 week'
  return '2+ weeks'
}

// Group size selectors. 100 is shown as "100+".
export const GUEST_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 30, 50, 100]

export function guestLabel(n: number): string {
  return n >= 100 ? '100+' : String(n)
}
