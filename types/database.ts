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
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          starts_at: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          created_at: string | null
          genre: string | null
          id: string
          name: string
          photo_url: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          genre?: string | null
          id?: string
          name: string
          photo_url?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          genre?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      builder_catalog: {
        Row: {
          active: boolean | null
          category: string
          id: string
          service_id: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          category: string
          id?: string
          service_id: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string
          id?: string
          service_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_catalog_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string
          day_of_week: string
          id: string
          open_time: string
        }
        Insert: {
          business_id: string
          close_time: string
          day_of_week: string
          id?: string
          open_time: string
        }
        Update: {
          business_id?: string
          close_time?: string
          day_of_week?: string
          id?: string
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offers: {
        Row: {
          business_id: string
          created_at: string | null
          days_active: string[] | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          offer_type: string | null
          time_end: string | null
          time_start: string | null
          title: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          days_active?: string[] | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          offer_type?: string | null
          time_end?: string | null
          time_start?: string | null
          title: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          days_active?: string[] | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          offer_type?: string | null
          time_end?: string | null
          time_start?: string | null
          title?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          avg_duration_minutes: number | null
          avg_spend: number | null
          category: string
          created_at: string | null
          energy_type: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          tags: string[] | null
        }
        Insert: {
          address?: string | null
          avg_duration_minutes?: number | null
          avg_spend?: number | null
          category: string
          created_at?: string | null
          energy_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          tags?: string[] | null
        }
        Update: {
          address?: string | null
          avg_duration_minutes?: number | null
          avg_spend?: number | null
          category?: string
          created_at?: string | null
          energy_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          crew_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          crew_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          crew_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          invite_code: string | null
          is_private: boolean | null
          is_public: boolean | null
          max_members: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean | null
          is_public?: boolean | null
          max_members?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string | null
          is_private?: boolean | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_picks: {
        Row: {
          active: boolean
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string | null
          headline: string
          id: string
          sort_order: number
          starts_at: string
        }
        Insert: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string | null
          headline: string
          id?: string
          sort_order?: number
          starts_at?: string
        }
        Update: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string | null
          headline?: string
          id?: string
          sort_order?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_picks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_plans: {
        Row: {
          active: boolean | null
          cover_image_url: string | null
          created_at: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          estimated_duration_hours: number | null
          flash_deal_expires_at: string | null
          flash_deal_label: string | null
          id: string
          is_featured: boolean | null
          is_flash_deal: boolean | null
          stops: Json
          subtitle: string | null
          tags: string[] | null
          theme: string | null
          time_of_day: string | null
          title: string
          vibe: string | null
        }
        Insert: {
          active?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_duration_hours?: number | null
          flash_deal_expires_at?: string | null
          flash_deal_label?: string | null
          id?: string
          is_featured?: boolean | null
          is_flash_deal?: boolean | null
          stops?: Json
          subtitle?: string | null
          tags?: string[] | null
          theme?: string | null
          time_of_day?: string | null
          title: string
          vibe?: string | null
        }
        Update: {
          active?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_duration_hours?: number | null
          flash_deal_expires_at?: string | null
          flash_deal_label?: string | null
          id?: string
          is_featured?: boolean | null
          is_flash_deal?: boolean | null
          stops?: Json
          subtitle?: string | null
          tags?: string[] | null
          theme?: string | null
          time_of_day?: string | null
          title?: string
          vibe?: string | null
        }
        Relationships: []
      }
      day_plans: {
        Row: {
          budget_range: string | null
          created_at: string | null
          energy_type: string | null
          group_type: string | null
          id: string
          plan_date: string | null
          status: string | null
          stops: Json
          tags: string[] | null
          time_end: string | null
          time_start: string | null
          total_duration_minutes: number | null
          total_estimated_spend: number | null
          transportation: string | null
          user_id: string | null
        }
        Insert: {
          budget_range?: string | null
          created_at?: string | null
          energy_type?: string | null
          group_type?: string | null
          id?: string
          plan_date?: string | null
          status?: string | null
          stops?: Json
          tags?: string[] | null
          time_end?: string | null
          time_start?: string | null
          total_duration_minutes?: number | null
          total_estimated_spend?: number | null
          transportation?: string | null
          user_id?: string | null
        }
        Update: {
          budget_range?: string | null
          created_at?: string | null
          energy_type?: string | null
          group_type?: string | null
          id?: string
          plan_date?: string | null
          status?: string | null
          stops?: Json
          tags?: string[] | null
          time_end?: string | null
          time_start?: string | null
          total_duration_minutes?: number | null
          total_estimated_spend?: number | null
          transportation?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          active: boolean
          cover_image_url: string | null
          created_at: string
          description: string | null
          event_id: string | null
          expires_at: string | null
          headline: string
          id: string
          promo_code_id: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          expires_at?: string | null
          headline: string
          id?: string
          promo_code_id?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          expires_at?: string | null
          headline?: string
          id?: string
          promo_code_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_analytics: {
        Row: {
          add_to_cart: number | null
          checkouts_started: number | null
          created_at: string | null
          date: string | null
          event_id: string
          id: string
          purchases_completed: number | null
          revenue_total: number | null
          ticket_page_views: number | null
          unique_views: number | null
          views: number | null
        }
        Insert: {
          add_to_cart?: number | null
          checkouts_started?: number | null
          created_at?: string | null
          date?: string | null
          event_id: string
          id?: string
          purchases_completed?: number | null
          revenue_total?: number | null
          ticket_page_views?: number | null
          unique_views?: number | null
          views?: number | null
        }
        Update: {
          add_to_cart?: number | null
          checkouts_started?: number | null
          created_at?: string | null
          date?: string | null
          event_id?: string
          id?: string
          purchases_completed?: number | null
          revenue_total?: number | null
          ticket_page_views?: number | null
          unique_views?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          event_id: string
          role: string | null
        }
        Insert: {
          artist_id: string
          event_id: string
          role?: string | null
        }
        Update: {
          artist_id?: string
          event_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_drafts: {
        Row: {
          category: Database["public"]["Enums"]["event_category"] | null
          created_at: string | null
          description: string | null
          event_date: string | null
          featured: boolean | null
          flyer_image_url: string | null
          id: string
          name: string | null
          promoter_id: string
          published_event_id: string | null
          sale_end_date: string | null
          sale_start_date: string | null
          status: string | null
          ticket_prices: Json | null
          tier_discounts: Json | null
          total_tickets: number | null
          updated_at: string | null
          venue_address: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"] | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          featured?: boolean | null
          flyer_image_url?: string | null
          id?: string
          name?: string | null
          promoter_id: string
          published_event_id?: string | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          status?: string | null
          ticket_prices?: Json | null
          tier_discounts?: Json | null
          total_tickets?: number | null
          updated_at?: string | null
          venue_address?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"] | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          featured?: boolean | null
          flyer_image_url?: string | null
          id?: string
          name?: string | null
          promoter_id?: string
          published_event_id?: string | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          status?: string | null
          ticket_prices?: Json | null
          tier_discounts?: Json | null
          total_tickets?: number | null
          updated_at?: string | null
          venue_address?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_drafts_published_event_id_fkey"
            columns: ["published_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_drafts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      event_pitches: {
        Row: {
          category: string
          created_at: string | null
          date_end: string
          date_start: string
          description: string
          group_id: string
          id: string
          ideas_details: string | null
          interest_count: number | null
          organizer_id: string
          preferred_locations: string[] | null
          price_max: number
          price_min: number
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          date_end: string
          date_start: string
          description: string
          group_id: string
          id?: string
          ideas_details?: string | null
          interest_count?: number | null
          organizer_id: string
          preferred_locations?: string[] | null
          price_max?: number
          price_min?: number
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          date_end?: string
          date_start?: string
          description?: string
          group_id?: string
          id?: string
          ideas_details?: string | null
          interest_count?: number | null
          organizer_id?: string
          preferred_locations?: string[] | null
          price_max?: number
          price_min?: number
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_pitches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_pitches_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_risk_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          flag_type: string
          id: string
          notes: string | null
          resolved: boolean | null
          severity: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          flag_type: string
          id?: string
          notes?: string | null
          resolved?: boolean | null
          severity?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          flag_type?: string
          id?: string
          notes?: string | null
          resolved?: boolean | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_risk_flags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          additional_images: string[] | null
          age_restriction: string | null
          category: Database["public"]["Enums"]["event_category"]
          created_at: string | null
          created_by: string | null
          custom_address: string | null
          description: string
          event_date: string
          featured: boolean | null
          featured_until: string | null
          flyer_image_url: string | null
          group_id: string | null
          id: string
          marketing_package: string | null
          max_tickets_per_user: number | null
          name: string
          promoter_id: string | null
          refund_policy: string | null
          sale_end_date: string | null
          sale_start_date: string | null
          special_instructions: string | null
          status: string | null
          tags: string[] | null
          target_age_ranges: string[] | null
          target_neighborhoods: string[] | null
          target_vibes: string[] | null
          ticket_prices: Json
          tickets_sold: number | null
          tier_discounts: Json | null
          total_tickets: number | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          additional_images?: string[] | null
          age_restriction?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string | null
          created_by?: string | null
          custom_address?: string | null
          description: string
          event_date: string
          featured?: boolean | null
          featured_until?: string | null
          flyer_image_url?: string | null
          group_id?: string | null
          id?: string
          marketing_package?: string | null
          max_tickets_per_user?: number | null
          name: string
          promoter_id?: string | null
          refund_policy?: string | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          special_instructions?: string | null
          status?: string | null
          tags?: string[] | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
          ticket_prices: Json
          tickets_sold?: number | null
          tier_discounts?: Json | null
          total_tickets?: number | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          additional_images?: string[] | null
          age_restriction?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string | null
          created_by?: string | null
          custom_address?: string | null
          description?: string
          event_date?: string
          featured?: boolean | null
          featured_until?: string | null
          flyer_image_url?: string | null
          group_id?: string | null
          id?: string
          marketing_package?: string | null
          max_tickets_per_user?: number | null
          name?: string
          promoter_id?: string | null
          refund_policy?: string | null
          sale_end_date?: string | null
          sale_start_date?: string | null
          special_instructions?: string | null
          status?: string | null
          tags?: string[] | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
          ticket_prices?: Json
          tickets_sold?: number | null
          tier_discounts?: Json | null
          total_tickets?: number | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
      group_feed_items: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          item_type: string
          reference_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          item_type: string
          reference_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          item_type?: string
          reference_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_feed_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          invited_by: string | null
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string | null
          id: string
          invited_by: string | null
          joined_at: string | null
          notifications_enabled: boolean | null
          status: string
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          notifications_enabled?: boolean | null
          status?: string
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          notifications_enabled?: boolean | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_organizers: {
        Row: {
          assigned_at: string
          assigned_by: string
          group_id: string
          id: string
          promoter_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          group_id: string
          id?: string
          promoter_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          group_id?: string
          id?: string
          promoter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_organizers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_organizers_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
        ]
      }
      group_poll_votes: {
        Row: {
          id: string
          option_id: string
          poll_id: string | null
          user_id: string | null
          voted_at: string | null
        }
        Insert: {
          id?: string
          option_id: string
          poll_id?: string | null
          user_id?: string | null
          voted_at?: string | null
        }
        Update: {
          id?: string
          option_id?: string
          poll_id?: string | null
          user_id?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          closes_at: string | null
          created_at: string | null
          group_id: string | null
          id: string
          options: Json
          post_id: string | null
          question: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          options: Json
          post_id?: string | null
          question: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          options?: Json
          post_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          group_id: string | null
          id: string
          is_pinned: boolean | null
          post_type: string | null
          title: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          post_type?: string | null
          title?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          post_type?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_spotlights: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          image_url: string | null
          link_url: string | null
          subject: string
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          subject: string
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_spotlights_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          about: string | null
          accent_color: string | null
          card_image_url: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          early_access_hours: number | null
          id: string
          is_active: boolean | null
          member_count: number | null
          name: string
          rules: string | null
          slug: string
          sort_order: number | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          accent_color?: string | null
          card_image_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          early_access_hours?: number | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name: string
          rules?: string | null
          slug: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          accent_color?: string | null
          card_image_url?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          early_access_hours?: number | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name?: string
          rules?: string | null
          slug?: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invite_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          sent_count: number | null
          target_age_ranges: string[] | null
          target_neighborhoods: string[] | null
          target_vibes: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          sent_count?: number | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          sent_count?: number | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      live_now_slots: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          ends_at: string
          event_id: string
          id: string
          notes: string | null
          paid: boolean
          promoter_id: string | null
          slot_type: string
          starts_at: string
          status: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          ends_at: string
          event_id: string
          id?: string
          notes?: string | null
          paid?: boolean
          promoter_id?: string | null
          slot_type?: string
          starts_at: string
          status?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          ends_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          paid?: boolean
          promoter_id?: string | null
          slot_type?: string
          starts_at?: string
          status?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_now_slots_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_now_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_now_slots_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_now_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          item_description: string | null
          item_id: string | null
          item_name: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          metadata: Json | null
          order_id: string
          perk_id: string | null
          quantity: number
          subtotal: number
          ticket_type_id: string | null
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name: string
          item_type?: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json | null
          order_id: string
          perk_id?: string | null
          quantity?: number
          subtotal: number
          ticket_type_id?: string | null
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name?: string
          item_type?: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json | null
          order_id?: string
          perk_id?: string | null
          quantity?: number
          subtotal?: number
          ticket_type_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
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
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          event_id: string
          fees: number | null
          id: string
          ip_address: unknown
          notes: string | null
          order_number: string
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          promo_code: string | null
          promo_code_id: string | null
          promo_code_used: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          event_id: string
          fees?: number | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          order_number: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_code_used?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          event_id?: string
          fees?: number | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          order_number?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_code_used?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_feedback: {
        Row: {
          action_commitment: string | null
          additional_comments: string | null
          id: string
          interest_level: string
          member_id: string
          pitch_id: string
          preferred_dates: string[] | null
          preferred_location: string | null
          price_acceptable: boolean | null
          price_range_max: number | null
          price_range_min: number | null
          submitted_at: string | null
          thumbs_vote: string | null
          updated_at: string | null
        }
        Insert: {
          action_commitment?: string | null
          additional_comments?: string | null
          id?: string
          interest_level: string
          member_id: string
          pitch_id: string
          preferred_dates?: string[] | null
          preferred_location?: string | null
          price_acceptable?: boolean | null
          price_range_max?: number | null
          price_range_min?: number | null
          submitted_at?: string | null
          thumbs_vote?: string | null
          updated_at?: string | null
        }
        Update: {
          action_commitment?: string | null
          additional_comments?: string | null
          id?: string
          interest_level?: string
          member_id?: string
          pitch_id?: string
          preferred_dates?: string[] | null
          preferred_location?: string | null
          price_acceptable?: boolean | null
          price_range_max?: number | null
          price_range_min?: number | null
          submitted_at?: string | null
          thumbs_vote?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_feedback_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_feedback_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "event_pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_requests: {
        Row: {
          budget_range: string | null
          contact_email: string | null
          created_at: string | null
          estimated_total: number | null
          event_date: string | null
          event_type: string
          guest_count: string | null
          has_venue: boolean | null
          id: string
          needs: Json | null
          notes: string | null
          selected_package_id: string | null
          selected_service_ids: string[] | null
          status: string | null
          time_end: string | null
          time_start: string | null
          user_id: string | null
        }
        Insert: {
          budget_range?: string | null
          contact_email?: string | null
          created_at?: string | null
          estimated_total?: number | null
          event_date?: string | null
          event_type: string
          guest_count?: string | null
          has_venue?: boolean | null
          id?: string
          needs?: Json | null
          notes?: string | null
          selected_package_id?: string | null
          selected_service_ids?: string[] | null
          status?: string | null
          time_end?: string | null
          time_start?: string | null
          user_id?: string | null
        }
        Update: {
          budget_range?: string | null
          contact_email?: string | null
          created_at?: string | null
          estimated_total?: number | null
          event_date?: string | null
          event_type?: string
          guest_count?: string | null
          has_venue?: boolean | null
          id?: string
          needs?: Json | null
          notes?: string | null
          selected_package_id?: string | null
          selected_service_ids?: string[] | null
          status?: string | null
          time_end?: string | null
          time_start?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          active: boolean
          id: string
          points: number
          reason: Database["public"]["Enums"]["point_reason"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          id?: string
          points: number
          reason: Database["public"]["Enums"]["point_reason"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          id?: string
          points?: number
          reason?: Database["public"]["Enums"]["point_reason"]
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: Database["public"]["Enums"]["point_reason"]
          reward_profile_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: Database["public"]["Enums"]["point_reason"]
          reward_profile_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: Database["public"]["Enums"]["point_reason"]
          reward_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_reward_profile_id_fkey"
            columns: ["reward_profile_id"]
            isOneToOne: false
            referencedRelation: "user_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string | null
          bio: string | null
          created_at: string | null
          email: string
          first_name: string | null
          gender: string | null
          id: string
          is_organizer: boolean | null
          is_parent: boolean | null
          last_name: string | null
          neighborhood: string | null
          phone: string | null
          relationship_status: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          id: string
          is_organizer?: boolean | null
          is_parent?: boolean | null
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          relationship_status?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_organizer?: boolean | null
          is_parent?: boolean | null
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          relationship_status?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          discount_amount: number
          id: string
          ip_address: unknown
          order_id: string
          order_total: number
          promo_code_id: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          discount_amount: number
          id?: string
          ip_address?: unknown
          order_id: string
          order_total: number
          promo_code_id: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          discount_amount?: number
          id?: string
          ip_address?: unknown
          order_id?: string
          order_total?: number
          promo_code_id?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean | null
          applies_to: string | null
          audience_scope: Json | null
          auto_apply: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          event_id: string | null
          id: string
          max_discount: number | null
          member_only: boolean | null
          min_purchase: number | null
          per_user_limit: number | null
          required_tier: Database["public"]["Enums"]["member_tier"] | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          applies_to?: string | null
          audience_scope?: Json | null
          auto_apply?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          event_id?: string | null
          id?: string
          max_discount?: number | null
          member_only?: boolean | null
          min_purchase?: number | null
          per_user_limit?: number | null
          required_tier?: Database["public"]["Enums"]["member_tier"] | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          applies_to?: string | null
          audience_scope?: Json | null
          auto_apply?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          event_id?: string | null
          id?: string
          max_discount?: number | null
          member_only?: boolean | null
          min_purchase?: number | null
          per_user_limit?: number | null
          required_tier?: Database["public"]["Enums"]["member_tier"] | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      promoter_applications: {
        Row: {
          business_name: string
          contact_email: string
          description: string | null
          expected_events_per_month: number | null
          id: string
          instagram_handle: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          business_name: string
          contact_email: string
          description?: string | null
          expected_events_per_month?: number | null
          id?: string
          instagram_handle?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          business_name?: string
          contact_email?: string
          description?: string | null
          expected_events_per_month?: number | null
          id?: string
          instagram_handle?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      promoter_features: {
        Row: {
          expires_at: string | null
          feature_id: string
          granted_by: string | null
          id: string
          promoter_id: string
          unlock_type: string
          unlocked_at: string | null
        }
        Insert: {
          expires_at?: string | null
          feature_id: string
          granted_by?: string | null
          id?: string
          promoter_id: string
          unlock_type: string
          unlocked_at?: string | null
        }
        Update: {
          expires_at?: string | null
          feature_id?: string
          granted_by?: string | null
          id?: string
          promoter_id?: string
          unlock_type?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoter_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "toolkit_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoter_features_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoter_features_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
        ]
      }
      promoter_marketing_packages: {
        Row: {
          created_at: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          package_tier: string
          promo_code_id: string | null
          promoter_id: string
          status: string | null
          target_age_ranges: string[] | null
          target_neighborhoods: string[] | null
          target_vibes: string[] | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          package_tier: string
          promo_code_id?: string | null
          promoter_id: string
          status?: string | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          package_tier?: string
          promo_code_id?: string | null
          promoter_id?: string
          status?: string | null
          target_age_ranges?: string[] | null
          target_neighborhoods?: string[] | null
          target_vibes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "promoter_marketing_packages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoter_marketing_packages_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promoters: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          instagram_handle: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          instagram_handle?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          instagram_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_day_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_date: string
          preferences: Json | null
          stops: Json
          total_estimated_spend: number | null
          total_time_minutes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_date: string
          preferences?: Json | null
          stops: Json
          total_estimated_spend?: number | null
          total_time_minutes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_date?: string
          preferences?: Json | null
          stops?: Json
          total_estimated_spend?: number | null
          total_time_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_day_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sweepstakes: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          prize_name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          prize_name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          prize_name?: string
          status?: string | null
        }
        Relationships: []
      }
      sweepstakes_entries: {
        Row: {
          entered_at: string | null
          id: string
          sweepstakes_id: string | null
          user_id: string | null
        }
        Insert: {
          entered_at?: string | null
          id?: string
          sweepstakes_id?: string | null
          user_id?: string | null
        }
        Update: {
          entered_at?: string | null
          id?: string
          sweepstakes_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sweepstakes_entries_sweepstakes_id_fkey"
            columns: ["sweepstakes_id"]
            isOneToOne: false
            referencedRelation: "sweepstakes"
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
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          base_price: number
          confirmation_code: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          order_id: string | null
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
          order_id?: string | null
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
          order_id?: string | null
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
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      tier_thresholds: {
        Row: {
          bonus_multiplier: number
          min_points: number
          tier: Database["public"]["Enums"]["reward_tier"]
        }
        Insert: {
          bonus_multiplier?: number
          min_points: number
          tier: Database["public"]["Enums"]["reward_tier"]
        }
        Update: {
          bonus_multiplier?: number
          min_points?: number
          tier?: Database["public"]["Enums"]["reward_tier"]
        }
        Relationships: []
      }
      toolkit_features: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_one_time: number | null
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_one_time?: number | null
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_one_time?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      user_behavior_snapshot: {
        Row: {
          activity_level: string | null
          avg_spend: number | null
          id: string
          last_calculated_at: string | null
          preferred_event_time: string | null
          purchase_pattern: string | null
          social_score: number | null
          total_orders: number | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          avg_spend?: number | null
          id?: string
          last_calculated_at?: string | null
          preferred_event_time?: string | null
          purchase_pattern?: string | null
          social_score?: number | null
          total_orders?: number | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          avg_spend?: number | null
          id?: string
          last_calculated_at?: string | null
          preferred_event_time?: string | null
          purchase_pattern?: string | null
          social_score?: number | null
          total_orders?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          balance: number
          created_at: string
          id: string
          last_visit_date: string | null
          lifetime_total: number
          referral_code: string
          referred_by: string | null
          streak_days: number
          tier: Database["public"]["Enums"]["reward_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          last_visit_date?: string | null
          lifetime_total?: number
          referral_code?: string
          referred_by?: string | null
          streak_days?: number
          tier?: Database["public"]["Enums"]["reward_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          last_visit_date?: string | null
          lifetime_total?: number
          referral_code?: string
          referred_by?: string | null
          streak_days?: number
          tier?: Database["public"]["Enums"]["reward_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stubs: {
        Row: {
          count: number
          created_at: string
          id: string
          lifetime_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          lifetime_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          lifetime_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vibes: {
        Row: {
          id: string
          updated_at: string | null
          user_id: string
          vibe_tags: string[] | null
        }
        Insert: {
          id?: string
          updated_at?: string | null
          user_id: string
          vibe_tags?: string[] | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          user_id?: string
          vibe_tags?: string[] | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_promoter: boolean | null
          member_tier: Database["public"]["Enums"]["member_tier"] | null
          phone: string | null
          promoter_approved_at: string | null
          promoter_approved_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_promoter?: boolean | null
          member_tier?: Database["public"]["Enums"]["member_tier"] | null
          phone?: string | null
          promoter_approved_at?: string | null
          promoter_approved_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_promoter?: boolean | null
          member_tier?: Database["public"]["Enums"]["member_tier"] | null
          phone?: string | null
          promoter_approved_at?: string | null
          promoter_approved_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_availability: {
        Row: {
          booked: boolean | null
          created_at: string | null
          date: string
          end_time: string
          id: string
          start_time: string
          vendor_id: string
        }
        Insert: {
          booked?: boolean | null
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          start_time: string
          vendor_id: string
        }
        Update: {
          booked?: boolean | null
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_availability_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_blackout_dates: {
        Row: {
          date: string
          id: string
          reason: string | null
          vendor_id: string
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
          vendor_id: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_blackout_dates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_dynamic_pricing: {
        Row: {
          day_of_week: string | null
          id: string
          price_multiplier: number | null
          vendor_id: string
        }
        Insert: {
          day_of_week?: string | null
          id?: string
          price_multiplier?: number | null
          vendor_id: string
        }
        Update: {
          day_of_week?: string | null
          id?: string
          price_multiplier?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_dynamic_pricing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          event_type: string | null
          id: string
          rating: number
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          rating: number
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          rating?: number
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_services: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: string
          includes: Json | null
          is_featured: boolean | null
          price: number
          title: string
          vendor_id: string
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          includes?: Json | null
          is_featured?: boolean | null
          price: number
          title: string
          vendor_id: string
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          includes?: Json | null
          is_featured?: boolean | null
          price?: number
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean | null
          available_days: string[] | null
          base_price: number | null
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          instagram_handle: string | null
          instant_book: boolean | null
          location: string | null
          name: string
          portfolio_images: string[] | null
          price_unit: string | null
          profile_image_url: string | null
          rating: number | null
          review_count: number | null
          service_radius_miles: number | null
          tier: string
          type: string
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          active?: boolean | null
          available_days?: string[] | null
          base_price?: number | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          instagram_handle?: string | null
          instant_book?: boolean | null
          location?: string | null
          name: string
          portfolio_images?: string[] | null
          price_unit?: string | null
          profile_image_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_radius_miles?: number | null
          tier?: string
          type: string
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          active?: boolean | null
          available_days?: string[] | null
          base_price?: number | null
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          instagram_handle?: string | null
          instant_book?: boolean | null
          location?: string | null
          name?: string
          portfolio_images?: string[] | null
          price_unit?: string | null
          profile_image_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_radius_miles?: number | null
          tier?: string
          type?: string
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          amenities: string[] | null
          capacity: number
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          image_urls: string[] | null
          name: string
          state: string | null
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
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          state?: string | null
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
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          state?: string | null
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
      award_points: {
        Args: {
          p_metadata?: Json
          p_reason: Database["public"]["Enums"]["point_reason"]
          p_user_id: string
        }
        Returns: Json
      }
      create_event: {
        Args: {
          p_category: Database["public"]["Enums"]["event_category"]
          p_description: string
          p_event_date: string
          p_featured?: boolean
          p_name: string
          p_ticket_prices: Json
          p_total_tickets: number
          p_venue_id: string
        }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_auto_apply_promos: {
        Args: { p_event_id: string; p_subtotal: number; p_user_id: string }
        Returns: {
          code: string
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          promo_id: string
        }[]
      }
      get_featured_events: {
        Args: never
        Returns: {
          category: string
          description: string
          event_date: string
          event_id: string
          event_name: string
          featured: boolean
          flyer_image_url: string
          max_price: number
          min_price: number
          tickets_available: number
          venue_address: string
          venue_name: string
        }[]
      }
      get_user_tickets: {
        Args: never
        Returns: {
          event_date: string
          event_name: string
          purchase_date: string
          purchase_price: number
          status: string
          ticket_id: string
          ticket_number: string
          ticket_type: string
          venue_name: string
        }[]
      }
      is_valid_email: { Args: { email: string }; Returns: boolean }
      purchase_tickets: {
        Args: {
          p_event_id: string
          p_quantity: number
          p_ticket_type_name: string
        }
        Returns: string
      }
      record_daily_visit: { Args: { p_user_id: string }; Returns: Json }
      record_promo_usage: {
        Args: {
          p_discount_amount: number
          p_order_id: string
          p_order_total: number
          p_promo_code_id: string
          p_user_id: string
        }
        Returns: string
      }
      validate_promo_code: {
        Args: {
          p_code: string
          p_event_id: string
          p_subtotal: number
          p_user_id: string
        }
        Returns: {
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          message: string
          promo_id: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed"
      event_category:
        | "nightlife"
        | "family"
        | "movies"
        | "dining"
        | "arts"
        | "sports"
        | "music"
        | "festivals"
      event_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "cancelled"
        | "completed"
        | "sold_out"
      member_tier: "basic" | "promoter" | "bottle_girl" | "team"
      membership_tier: "free" | "premium" | "vip"
      order_item_type: "ticket" | "booster" | "add_on" | "fee"
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
        | "partially_refunded"
      point_reason:
        | "ticket_purchase"
        | "daily_visit"
        | "profile_completed"
        | "profile_photo_added"
        | "event_saved"
        | "event_shared"
        | "referral_sent"
        | "referral_converted"
        | "admin_adjustment"
        | "bonus_campaign"
      reward_tier:
        | "explorer"
        | "insider"
        | "connector"
        | "ambassador"
        | "legend"
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
      discount_type: ["percentage", "fixed"],
      event_category: [
        "nightlife",
        "family",
        "movies",
        "dining",
        "arts",
        "sports",
        "music",
        "festivals",
      ],
      event_status: [
        "draft",
        "pending_approval",
        "active",
        "cancelled",
        "completed",
        "sold_out",
      ],
      member_tier: ["basic", "promoter", "bottle_girl", "team"],
      membership_tier: ["free", "premium", "vip"],
      order_item_type: ["ticket", "booster", "add_on", "fee"],
      order_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      point_reason: [
        "ticket_purchase",
        "daily_visit",
        "profile_completed",
        "profile_photo_added",
        "event_saved",
        "event_shared",
        "referral_sent",
        "referral_converted",
        "admin_adjustment",
        "bonus_campaign",
      ],
      reward_tier: ["explorer", "insider", "connector", "ambassador", "legend"],
      ticket_status: ["available", "reserved", "sold", "used", "refunded"],
    },
  },
} as const
