export interface PromoCode {
  id: string
  code: string
  name: string
  description?: string
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  max_discount_amount?: number
  max_uses: number
  current_uses: number
  max_uses_per_user?: number
  active: boolean
  starts_at?: string
  expires_at?: string
  applies_to_all_events: boolean
  specific_event_ids?: string[]
  tier_restrictions?: string[]
  created_by?: string
  created_at: string
  updated_at: string
  campaign_name?: string
  campaign_source?: string
}

export interface PromoValidationResult {
  valid: boolean
  error?: string
  discount_amount?: number
  original_price?: number
  final_price?: number
  promo_code?: PromoCode
}
