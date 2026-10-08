import type { Database } from '@/types/database'

// Partner-owned birthday offers are vendor_services rows (partner_id set, vendor_id null).
export type OfferRecord = Database['public']['Tables']['vendor_services']['Row']

export type OfferStatus = 'draft' | 'pending' | 'active' | 'needs_changes'

export type PricingModel = 'free' | 'flat' | 'per_person' | 'starting_at' | 'contact'

export type WizardMode = 'admin' | 'owner'

export interface PartnerSummary {
  id: string
  displayName: string
  // partner_categories.name, falling back to the legacy partners.category text,
  // matching how the offers API derives vendor_services.category.
  categoryName: string | null
}

export const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'flat', label: 'Flat price' },
  { value: 'per_person', label: 'Per person' },
  { value: 'starting_at', label: 'Starting at' },
  { value: 'contact', label: 'Contact us' },
]

// Models that need a price; free/contact are stored with price = 0.
export const PRICED_MODELS: ReadonlySet<string> = new Set(['flat', 'per_person', 'starting_at'])

export function pricingModelLabel(value: string | null | undefined): string | null {
  return PRICING_MODEL_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

// Headline price + qualifier for summaries and lists.
export function offerPriceDisplay(offer: Pick<OfferRecord, 'price' | 'pricing_model'>): {
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
    default:
      return { price: offer.price > 0 ? formatPrice(offer.price) : 'No price yet', qualifier: null }
  }
}
