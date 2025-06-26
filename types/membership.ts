export type MembershipTier = 'basic' | 'promoter' | 'bottle_girl' | 'team'

export interface Perk {
  id: string
  name: string
  description?: string
}

export interface Membership {
  id: string
  user_id: string
  tier: MembershipTier
  status: 'active' | 'suspended' | 'cancelled'
  card_identifier: string
  created_date: string
  upgraded_by?: string
  upgraded_at?: string
}

export interface MembershipWithPerks extends Membership {
  available_perks: Perk[]
  tier_benefits: string[]
}
