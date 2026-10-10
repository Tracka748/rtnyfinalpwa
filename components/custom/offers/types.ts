import type { Database } from '@/types/database'
import { discountTerms } from './perks'

// Partner-owned birthday offers are vendor_services rows (partner_id set, vendor_id null).
export type OfferRecord = Database['public']['Tables']['vendor_services']['Row']

export type OfferStatus = 'draft' | 'pending' | 'active' | 'needs_changes'

export type PricingModel =
  | 'free' | 'flat' | 'per_person' | 'starting_at' | 'contact'
  // Birthday-perk models; pricing_model mirrors details.offer_type.
  | 'discount' | 'bogo' | 'perk'

export type WizardMode = 'admin' | 'owner'

export interface PartnerSummary {
  id: string
  displayName: string
  // partner_categories.name, falling back to the legacy partners.category text,
  // matching how the offers API derives vendor_services.category.
  categoryName: string | null
}

// Fixed-price controls ("Switch to a fixed price"), in display order.
export const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string }[] = [
  { value: 'flat', label: 'Flat price' },
  { value: 'per_person', label: 'Per person' },
  { value: 'starting_at', label: 'Starting at' },
  { value: 'free', label: 'Free' },
  { value: 'contact', label: 'Contact us' },
]

// Models that need a price; every other model is stored with price = 0.
export const PRICED_MODELS: ReadonlySet<string> = new Set(['flat', 'per_person', 'starting_at'])

const MODEL_LABELS: Record<string, string> = {
  flat: 'Flat price',
  per_person: 'Per person',
  starting_at: 'Starting at',
  free: 'Free',
  contact: 'Contact us',
  discount: 'Discount',
  bogo: 'Buy one, get one',
  perk: 'Special perk',
}

export function pricingModelLabel(value: string | null | undefined): string | null {
  return value ? MODEL_LABELS[value] ?? null : null
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function detailNumber(details: unknown, key: string): number | null {
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return null
  const v = (details as Record<string, unknown>)[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function detailString(details: unknown, key: string): string | null {
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return null
  const v = (details as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : null
}

// Headline price + qualifier for summaries and lists.
export function offerPriceDisplay(offer: Pick<OfferRecord, 'price' | 'pricing_model' | 'details'>): {
  price: string
  qualifier: string | null
} {
  switch (offer.pricing_model) {
    case 'free':
      return { price: 'Free', qualifier: null }
    case 'contact':
      return { price: 'Contact us', qualifier: 'for pricing' }
    case 'per_person':
      return { price: formatPrice(offer.price), qualifier: 'per person' }
    case 'starting_at':
      return { price: formatPrice(offer.price), qualifier: 'starting at' }
    case 'flat':
      return { price: formatPrice(offer.price), qualifier: 'flat price' }
    case 'discount': {
      const terms = discountTerms(detailString(offer.details, 'discount_type'), detailNumber(offer.details, 'discount_value'))
      return { price: terms ?? 'Discount', qualifier: null }
    }
    case 'bogo':
      return { price: 'Buy one, get one', qualifier: null }
    case 'perk':
      return { price: 'Special perk', qualifier: null }
    default:
      return { price: offer.price > 0 ? formatPrice(offer.price) : 'No price yet', qualifier: null }
  }
}
