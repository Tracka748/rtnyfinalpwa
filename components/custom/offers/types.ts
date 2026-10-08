import type { Database } from '@/types/database'

// Partner-owned birthday offers are vendor_services rows (partner_id set, vendor_id null).
export type OfferRecord = Database['public']['Tables']['vendor_services']['Row']

export type OfferStatus = 'draft' | 'pending' | 'active' | 'needs_changes'

export type PricingModel = 'flat' | 'per_person' | 'starting_at'

export type WizardMode = 'admin' | 'owner'

export interface PartnerSummary {
  id: string
  displayName: string
  // partner_categories.name, falling back to the legacy partners.category text,
  // matching how the offers API derives vendor_services.category.
  categoryName: string | null
}

export const PRICING_MODEL_OPTIONS: { value: PricingModel; label: string }[] = [
  { value: 'flat', label: 'Flat price' },
  { value: 'per_person', label: 'Per person' },
  { value: 'starting_at', label: 'Starting at' },
]

export function pricingModelLabel(value: string | null | undefined): string | null {
  return PRICING_MODEL_OPTIONS.find((o) => o.value === value)?.label ?? null
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
