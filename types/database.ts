export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          additional_images: string[] | null
          age_restriction: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          event_date: string
          featured: boolean | null
          flyer_image_url: string | null
          id: string
          max_tickets_per_user: number | null
          name: string
          promoter_id: string
          refund_policy: string | null
          sale_end_date: string
          sale_start_date: string
          special_instructions: string | null
          status: string | null
          tags: string[] | null
          ticket_prices: Json
          tickets_sold: number | null
          tier_discounts: Json | null
          total_tickets: number
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          additional_images?: string[] | null
          age_restriction?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_date: string
          featured?: boolean | null
          flyer_image_url?: string | null
          id?: string
          max_tickets_per_user?: number | null
          name: string
          promoter_id: string
          refund_policy?: string | null
          sale_end_date: string
          sale_start_date: string
          special_instructions?: string | null
          status?: string | null
          tags?: string[] | null
          ticket_prices?: Json
          tickets_sold?: number | null
          tier_discounts?: Json | null
          total_tickets: number
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          additional_images?: string[] | null
          age_restriction?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_date?: string
          featured?: boolean | null
          flyer_image_url?: string | null
          id?: string
          max_tickets_per_user?: number | null
          name?: string
          promoter_id?: string
          refund_policy?: string | null
          sale_end_date?: string
          sale_start_date?: string
          special_instructions?: string | null
          status?: string | null
          tags?: string[] | null
          ticket_prices?: Json
          tickets_sold?: number | null
          tier_discounts?: Json | null
          total_tickets?: number
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_perks: {
        Row: {
          created_at: string | null
          daily_limit: number | null
          description: string
          event_restrictions: Json | null
          id: string
          monthly_limit: number | null
          name: string
          perk_type: string
          required_tier: string
          status: string | null
          updated_at: string | null
          validity_days: number | null
          value_amount: number | null
          value_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number | null
          description: string
          event_restrictions?: Json | null
          id?: string
          monthly_limit?: number | null
          name: string
          perk_type: string
          required_tier: string
          status?: string | null
          updated_at?: string | null
          validity_days?: number | null
          value_amount?: number | null
          value_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          daily_limit?: number | null
          description?: string
          event_restrictions?: Json | null
          id?: string
          monthly_limit?: number | null
          name?: string
          perk_type?: string
          required_tier?: string
          status?: string | null
          updated_at?: string | null
          validity_days?: number | null
          value_amount?: number | null
          value_percentage?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          order_id: string | null
          quantity: number
          ticket_type_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_id?: string | null
          quantity: number
          ticket_type_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          order_id?: string | null
          quantity?: number
          ticket_type_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          payment_intent_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status: string
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_intent_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_email: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_payment_intent_id: string
          ticket_ids: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          status: string
          stripe_payment_intent_id: string
          ticket_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string
          ticket_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      perk_redemptions: {
        Row: {
          event_id: string | null
          expires_at: string | null
          id: string
          perk_id: string
          perk_instance_id: string | null
          redeemed_at: string | null
          redemption_data: Json | null
          status: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          event_id?: string | null
          expires_at?: string | null
          id?: string
          perk_id: string
          perk_instance_id?: string | null
          redeemed_at?: string | null
          redemption_data?: Json | null
          status?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          event_id?: string | null
          expires_at?: string | null
          id?: string
          perk_id?: string
          perk_instance_id?: string | null
          redeemed_at?: string | null
          redemption_data?: Json | null
          status?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perk_redemptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perk_redemptions_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "membership_perks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perk_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      perks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          tier_required: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number
          tier_required?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          tier_required?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_for_user: string | null
          description: string | null
          discount_type: string
          discount_value: number
          event_id: string | null
          id: string
          restrictions: Json | null
          status: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_for_user?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          event_id?: string | null
          id?: string
          restrictions?: Json | null
          status?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_for_user?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          id?: string
          restrictions?: Json | null
          status?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_for_user_fkey"
            columns: ["created_for_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      promoters: {
        Row: {
          bio: string | null
          business_name: string
          business_type: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          id: string
          payout_settings: Json | null
          profile_image_url: string | null
          social_media: Json | null
          status: string | null
          stripe_account_id: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          business_name: string
          business_type?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          payout_settings?: Json | null
          profile_image_url?: string | null
          social_media?: Json | null
          status?: string | null
          stripe_account_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          business_name?: string
          business_type?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          payout_settings?: Json | null
          profile_image_url?: string | null
          social_media?: Json | null
          status?: string | null
          stripe_account_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sweepstakes: {
        Row: {
          allow_multiple_entries: boolean | null
          auto_draw: boolean | null
          created_at: string | null
          created_by: string | null
          description: string
          drawing_completed_at: string | null
          drawing_date: string
          eligibility_requirements: Json | null
          end_date: string
          entry_methods: string[]
          id: string
          max_entries_per_user: number | null
          name: string
          prize_structure: Json
          rules: string
          start_date: string
          status: string | null
          total_entries: number | null
          updated_at: string | null
        }
        Insert: {
          allow_multiple_entries?: boolean | null
          auto_draw?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description: string
          drawing_completed_at?: string | null
          drawing_date: string
          eligibility_requirements?: Json | null
          end_date: string
          entry_methods: string[]
          id?: string
          max_entries_per_user?: number | null
          name: string
          prize_structure: Json
          rules: string
          start_date: string
          status?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_multiple_entries?: boolean | null
          auto_draw?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          drawing_completed_at?: string | null
          drawing_date?: string
          eligibility_requirements?: Json | null
          end_date?: string
          entry_methods?: string[]
          id?: string
          max_entries_per_user?: number | null
          name?: string
          prize_structure?: Json
          rules?: string
          start_date?: string
          status?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sweepstakes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sweepstakes_entries: {
        Row: {
          entry_data: Json | null
          entry_method: string
          entry_timestamp: string | null
          id: string
          is_winner: boolean | null
          prize_claimed: boolean | null
          prize_claimed_at: string | null
          prize_tier: number | null
          sweepstakes_id: string
          user_id: string
        }
        Insert: {
          entry_data?: Json | null
          entry_method: string
          entry_timestamp?: string | null
          id?: string
          is_winner?: boolean | null
          prize_claimed?: boolean | null
          prize_claimed_at?: string | null
          prize_tier?: number | null
          sweepstakes_id: string
          user_id: string
        }
        Update: {
          entry_data?: Json | null
          entry_method?: string
          entry_timestamp?: string | null
          id?: string
          is_winner?: boolean | null
          prize_claimed?: boolean | null
          prize_claimed_at?: string | null
          prize_tier?: number | null
          sweepstakes_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sweepstakes_entries_sweepstakes_id_fkey"
            columns: ["sweepstakes_id"]
            isOneToOne: false
            referencedRelation: "sweepstakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sweepstakes_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          name: string
          price: number
          quantity: number
          remaining: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          name: string
          price: number
          quantity: number
          remaining: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          name?: string
          price?: number
          quantity?: number
          remaining?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          base_price: number
          confirmation_code: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          payment_intent_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          purchased_by: string | null
          qr_code_data: string | null
          reserved_until: string | null
          status: string | null
          ticket_number: string
          ticket_type: string
          updated_at: string | null
          used_at: string | null
        }
        Insert: {
          base_price: number
          confirmation_code?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          payment_intent_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchased_by?: string | null
          qr_code_data?: string | null
          reserved_until?: string | null
          status?: string | null
          ticket_number: string
          ticket_type: string
          updated_at?: string | null
          used_at?: string | null
        }
        Update: {
          base_price?: number
          confirmation_code?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          payment_intent_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchased_by?: string | null
          qr_code_data?: string | null
          reserved_until?: string | null
          status?: string | null
          ticket_number?: string
          ticket_type?: string
          updated_at?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          membership_expires_at: string | null
          membership_status: string | null
          phone: string | null
          preferences: Json | null
          profile_image_url: string | null
          referral_code: string | null
          referred_by: string | null
          tier: string | null
          total_purchases: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          membership_expires_at?: string | null
          membership_status?: string | null
          phone?: string | null
          preferences?: Json | null
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tier?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          membership_expires_at?: string | null
          membership_status?: string | null
          phone?: string | null
          preferences?: Json | null
          profile_image_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tier?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          amenities: string[] | null
          capacity: number
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          image_urls: string[] | null
          name: string
          state: string
          status: string | null
          updated_at: string | null
          venue_type: string | null
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          capacity: number
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          state?: string
          status?: string | null
          updated_at?: string | null
          venue_type?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          capacity?: number
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          state?: string
          status?: string | null
          updated_at?: string | null
          venue_type?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      event_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "cancelled"
        | "completed"
        | "sold_out"
      membership_tier: "free" | "premium" | "vip"
      ticket_status: "available" | "reserved" | "sold" | "used" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: [
        "draft",
        "pending_approval",
        "active",
        "cancelled",
        "completed",
        "sold_out",
      ],
      membership_tier: ["free", "premium", "vip"],
      ticket_status: ["available", "reserved", "sold", "used", "refunded"],
    },
  },
} as const
