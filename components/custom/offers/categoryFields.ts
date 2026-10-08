// Extra step-3 questions per partner category. Answers are stored in
// vendor_services.details, which the offers API limits to <= 20 keys with
// string (<= 500 chars) or number values.

export type AdaptiveField =
  | { key: string; label: string; kind: 'money'; hint?: string }
  | { key: string; label: string; kind: 'integer'; min: number; max: number; suffix?: string; hint?: string }
  | { key: string; label: string; kind: 'text'; maxLength: number; multiline?: boolean; placeholder?: string; hint?: string }
  | { key: string; label: string; kind: 'chips'; options: { value: string; label: string }[]; hint?: string }

export interface CategoryFieldGroup {
  heading: string
  fields: AdaptiveField[]
}

const VENUE: CategoryFieldGroup = {
  heading: 'Venue details',
  fields: [
    { key: 'deposit', label: 'Deposit to book', kind: 'money', hint: 'Leave blank if you don’t take a deposit.' },
    {
      key: 'catering_rules',
      label: 'Food & drink rules',
      kind: 'text',
      maxLength: 500,
      multiline: true,
      placeholder: 'e.g. In-house catering only, outside cake allowed',
    },
    {
      key: 'private_event_availability',
      label: 'When can you host private parties?',
      kind: 'text',
      maxLength: 200,
      placeholder: 'e.g. Fri–Sun evenings, weekday afternoons by request',
    },
  ],
}

const PHOTO_VIDEO: CategoryFieldGroup = {
  heading: 'Session details',
  fields: [
    { key: 'session_minutes', label: 'Session length', kind: 'integer', min: 1, max: 1440, suffix: 'min' },
    { key: 'edited_photos', label: 'Edited photos delivered', kind: 'integer', min: 0, max: 10000 },
    { key: 'delivery_days', label: 'Delivered within', kind: 'integer', min: 0, max: 365, suffix: 'days' },
  ],
}

const BEAUTY_WELLNESS: CategoryFieldGroup = {
  heading: 'Service details',
  fields: [
    {
      key: 'service_format',
      label: 'Format',
      kind: 'chips',
      options: [
        { value: 'individual', label: 'Individual' },
        { value: 'group', label: 'Group' },
      ],
    },
    { key: 'clients', label: 'Clients included', kind: 'integer', min: 1, max: 1000 },
    {
      key: 'location_type',
      label: 'Where it happens',
      kind: 'chips',
      options: [
        { value: 'mobile', label: 'We come to you' },
        { value: 'in-location', label: 'At our location' },
      ],
    },
  ],
}

const TRANSPORTATION: CategoryFieldGroup = {
  heading: 'Ride details',
  fields: [
    { key: 'passenger_capacity', label: 'Passenger capacity', kind: 'integer', min: 1, max: 500 },
    { key: 'service_area', label: 'Service area', kind: 'text', maxLength: 200, placeholder: 'e.g. Rochester + 30 miles' },
    { key: 'vehicle_type', label: 'Vehicle type', kind: 'text', maxLength: 100, placeholder: 'e.g. Party bus, stretch limo' },
  ],
}

// Keyed on lower-cased partner_categories.name.
const CATEGORY_LOOKUP: Record<string, CategoryFieldGroup> = {
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

export function fieldsForCategory(categoryName: string | null | undefined): CategoryFieldGroup | null {
  if (!categoryName) return null
  return CATEGORY_LOOKUP[categoryName.trim().toLowerCase()] ?? null
}
