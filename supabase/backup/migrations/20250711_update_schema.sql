-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.sweepstakes_entries CASCADE;
DROP TABLE IF EXISTS public.sweepstakes CASCADE;
DROP TABLE IF EXISTS public.perk_redemptions CASCADE;
DROP TABLE IF EXISTS public.membership_perks CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;
DROP TABLE IF EXISTS public.payment_intents CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.promoters CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS membership_tier CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE membership_tier AS ENUM ('free', 'premium', 'vip');
CREATE TYPE ticket_status AS ENUM ('available', 'reserved', 'sold', 'used', 'refunded');
CREATE TYPE event_status AS ENUM (
    'draft',
    'pending_approval',
    'active',
    'cancelled',
    'completed',
    'sold_out'
);

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'vip')),
    membership_status TEXT DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended')),
    membership_expires_at TIMESTAMPTZ,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.users(id),
    profile_image_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues table
CREATE TABLE public.venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Rochester',
    state TEXT NOT NULL DEFAULT 'NY',
    zip_code TEXT,
    capacity INTEGER NOT NULL,
    venue_type TEXT CHECK (venue_type IN ('indoor', 'outdoor', 'hybrid')),
    amenities TEXT[],
    contact_email TEXT,
    contact_phone TEXT,
    website_url TEXT,
    image_urls TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promoters table
CREATE TABLE public.promoters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT,
    tax_id TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    bio TEXT,
    profile_image_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    stripe_account_id TEXT,
    payout_settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    sale_start_date TIMESTAMPTZ NOT NULL,
    sale_end_date TIMESTAMPTZ NOT NULL,
    venue_id UUID REFERENCES public.venues(id) NOT NULL,
    promoter_id UUID REFERENCES public.promoters(id) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('music', 'sports', 'theater', 'comedy', 'conference', 'other')),
    age_restriction TEXT DEFAULT 'all_ages' CHECK (age_restriction IN ('all_ages', '18+', '21+')),
    ticket_prices JSONB NOT NULL DEFAULT '{}',
    tier_discounts JSONB DEFAULT '{}',
    max_tickets_per_user INTEGER DEFAULT 10,
    total_tickets INTEGER NOT NULL,
    tickets_sold INTEGER DEFAULT 0,
    flyer_image_url TEXT,
    additional_images TEXT[],
    tags TEXT[],
    special_instructions TEXT,
    refund_policy TEXT DEFAULT 'partial' CHECK (refund_policy IN ('full', 'partial', 'none')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'cancelled', 'completed', 'sold_out')),
    featured BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table
CREATE TABLE public.tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    ticket_type TEXT NOT NULL,
    ticket_number TEXT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    purchase_price DECIMAL(10,2),
    purchased_by UUID REFERENCES public.users(id),
    purchase_date TIMESTAMPTZ,
    payment_intent_id TEXT,
    confirmation_code TEXT,
    qr_code_data TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'used', 'refunded')),
    reserved_until TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, ticket_number)
);

-- Membership perks table
CREATE TABLE public.membership_perks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    perk_type TEXT NOT NULL CHECK (perk_type IN ('early_access', 'discount_code', 'exclusive_event', 'priority_support', 'merchandise_discount')),
    required_tier TEXT NOT NULL CHECK (required_tier IN ('premium', 'vip')),
    value_amount DECIMAL(10,2),
    value_percentage INTEGER,
    daily_limit INTEGER DEFAULT 0,
    monthly_limit INTEGER DEFAULT 0,
    validity_days INTEGER DEFAULT 30,
    event_restrictions JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perk redemptions table
CREATE TABLE public.perk_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    perk_id UUID REFERENCES public.membership_perks(id) NOT NULL,
    event_id UUID REFERENCES public.events(id),
    perk_instance_id TEXT,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    redemption_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired'))
);

-- Sweepstakes table
CREATE TABLE public.sweepstakes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    rules TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    drawing_date TIMESTAMPTZ NOT NULL,
    entry_methods TEXT[] NOT NULL,
    max_entries_per_user INTEGER DEFAULT 1,
    allow_multiple_entries BOOLEAN DEFAULT FALSE,
    prize_structure JSONB NOT NULL,
    eligibility_requirements JSONB DEFAULT '{}',
    auto_draw BOOLEAN DEFAULT TRUE,
    total_entries INTEGER DEFAULT 0,
    drawing_completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sweepstakes entries table
CREATE TABLE public.sweepstakes_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    sweepstakes_id UUID REFERENCES public.sweepstakes(id) ON DELETE CASCADE NOT NULL,
    entry_method TEXT NOT NULL CHECK (entry_method IN ('purchase', 'social_share', 'referral', 'manual')),
    entry_data JSONB DEFAULT '{}',
    entry_timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_winner BOOLEAN DEFAULT FALSE,
    prize_tier INTEGER,
    prize_claimed BOOLEAN DEFAULT FALSE,
    prize_claimed_at TIMESTAMPTZ
);

-- Promo codes table
CREATE TABLE public.promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    usage_limit INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    event_id UUID REFERENCES public.events(id),
    created_for_user UUID REFERENCES public.users(id),
    restrictions JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment intents table (for tracking Stripe payments)
CREATE TABLE public.payment_intents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id),
    event_id UUID REFERENCES public.events(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    ticket_ids UUID[],
    customer_email TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_tier ON public.users(tier);
CREATE INDEX idx_users_referral_code ON public.users(referral_code);

CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_venue ON public.events(venue_id);
CREATE INDEX idx_events_promoter ON public.events(promoter_id);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_featured ON public.events(featured);

CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_user ON public.tickets(purchased_by);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_type ON public.tickets(ticket_type);

CREATE INDEX idx_perk_redemptions_user ON public.perk_redemptions(user_id);
CREATE INDEX idx_perk_redemptions_perk ON public.perk_redemptions(perk_id);
CREATE INDEX idx_perk_redemptions_date ON public.perk_redemptions(redeemed_at);

CREATE INDEX idx_sweepstakes_entries_user ON public.sweepstakes_entries(user_id);
CREATE INDEX idx_sweepstakes_entries_sweepstakes ON public.sweepstakes_entries(sweepstakes_id);
CREATE INDEX idx_sweepstakes_entries_winner ON public.sweepstakes_entries(is_winner);

CREATE INDEX idx_payment_intents_user ON public.payment_intents(user_id);
CREATE INDEX idx_payment_intents_event ON public.payment_intents(event_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promoters_updated_at BEFORE UPDATE ON public.promoters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_perks_updated_at BEFORE UPDATE ON public.membership_perks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RTNY' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after ticket purchase
CREATE OR REPLACE FUNCTION update_user_purchase_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchased_by IS NOT NULL AND OLD.purchased_by IS NULL THEN
        UPDATE public.users 
        SET 
            total_purchases = total_purchases + 1,
            total_spent = total_spent + NEW.purchase_price
        WHERE id = NEW.purchased_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_purchase 
    AFTER UPDATE ON public.tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_purchase_stats();

-- Function to update event ticket counts
CREATE OR REPLACE FUNCTION update_event_ticket_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- If ticket was just purchased
        IF NEW.purchased_by IS NOT NULL AND OLD.purchased_by IS NULL THEN
            UPDATE public.events 
            SET tickets_sold = tickets_sold + 1
            WHERE id = NEW.event_id;
            
            -- Check if event is sold out
            UPDATE public.events 
            SET status = 'sold_out'
            WHERE id = NEW.event_id 
            AND tickets_sold >= total_tickets 
            AND status = 'active';
        END IF;
        
        -- If ticket was refunded
        IF NEW.purchased_by IS NULL AND OLD.purchased_by IS NOT NULL THEN
            UPDATE public.events 
            SET tickets_sold = tickets_sold - 1
            WHERE id = NEW.event_id;
            
            -- Reactivate event if it was sold out
            UPDATE public.events 
            SET status = 'active'
            WHERE id = NEW.event_id 
            AND status = 'sold_out';
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_counts_on_ticket_change 
    AFTER UPDATE ON public.tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_event_ticket_counts();
