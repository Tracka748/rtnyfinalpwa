-- Promo Codes System Migration
-- Run this after the initial schema

-- Promo codes table
CREATE TABLE promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Discount Configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount_amount DECIMAL(10,2), -- For percentage caps
  
  -- Usage Limits
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- Validity
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Event Targeting
  applies_to_all_events BOOLEAN NOT NULL DEFAULT false,
  specific_event_ids UUID[], -- Array of event IDs
  
  -- Tier Restrictions (optional)
  tier_restrictions TEXT[] CHECK (
    tier_restrictions IS NULL OR 
    tier_restrictions <@ ARRAY['basic', 'promoter', 'bottle_girl', 'team']
  ),
  
  -- Admin Management
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Campaign Tracking
  campaign_name TEXT,
  campaign_source TEXT, -- 'instagram', 'twitter', 'facebook', etc.
  
  CONSTRAINT valid_discount_value CHECK (
    (discount_type = 'fixed' AND discount_value > 0) OR
    (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100)
  )
);

-- Promo code usages table
CREATE TABLE promo_code_usages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Usage Details
  discount_applied DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  
  -- Tracking
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Prevent duplicate usage
  UNIQUE(promo_code_id, user_id, event_id)
);

-- Add promo code reference to tickets table
ALTER TABLE tickets ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id);

-- Indexes for performance
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(active);
CREATE INDEX idx_promo_codes_expires_at ON promo_codes(expires_at);
CREATE INDEX idx_promo_codes_campaign ON promo_codes(campaign_name);
CREATE INDEX idx_promo_usages_promo_code ON promo_code_usages(promo_code_id);
CREATE INDEX idx_promo_usages_user ON promo_code_usages(user_id);
CREATE INDEX idx_promo_usages_event ON promo_code_usages(event_id);
CREATE INDEX idx_promo_usages_date ON promo_code_usages(used_at);
CREATE INDEX idx_tickets_promo_code ON tickets(promo_code_id);
