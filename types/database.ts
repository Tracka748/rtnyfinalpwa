export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email?: string
          phone?: string
          name?: string
          created_at: string
          updated_at: string
          preferences: Json
        }
        Insert: {
          id?: string
          email?: string
          phone?: string
          name?: string
          created_at?: string
          updated_at?: string
          preferences?: Json
        }
        Update: {
          id?: string
          email?: string
          phone?: string
          name?: string
          created_at?: string
          updated_at?: string
          preferences?: Json
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          tier: 'basic' | 'promoter' | 'bottle_girl' | 'team'
          status: 'active' | 'suspended' | 'cancelled'
          card_identifier: string
          created_date: string
          upgraded_by?: string
          upgraded_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: 'basic' | 'promoter' | 'bottle_girl' | 'team'
          status?: 'active' | 'suspended' | 'cancelled'
          card_identifier: string
          created_date?: string
          upgraded_by?: string
          upgraded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'basic' | 'promoter' | 'bottle_girl' | 'team'
          status?: 'active' | 'suspended' | 'cancelled'
          card_identifier?: string
          created_date?: string
          upgraded_by?: string
          upgraded_at?: string
        }
      }
      promo_codes: {
        Row: {
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
        Insert: {
          id?: string
          code: string
          name: string
          description?: string
          discount_type: 'fixed' | 'percentage'
          discount_value: number
          max_discount_amount?: number
          max_uses?: number
          current_uses?: number
          max_uses_per_user?: number
          active?: boolean
          starts_at?: string
          expires_at?: string
          applies_to_all_events?: boolean
          specific_event_ids?: string[]
          tier_restrictions?: string[]
          created_by?: string
          created_at?: string
          updated_at?: string
          campaign_name?: string
          campaign_source?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string
          discount_type?: 'fixed' | 'percentage'
          discount_value?: number
          max_discount_amount?: number
          max_uses?: number
          current_uses?: number
          max_uses_per_user?: number
          active?: boolean
          starts_at?: string
          expires_at?: string
          applies_to_all_events?: boolean
          specific_event_ids?: string[]
          tier_restrictions?: string[]
          created_by?: string
          created_at?: string
          updated_at?: string
          campaign_name?: string
          campaign_source?: string
        }
      }
    }
  }
}
