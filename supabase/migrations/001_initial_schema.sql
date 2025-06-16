-- ROCticketNy Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT users_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Venues table
CREATE TABLE venues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Rochester',
  state TEXT NOT NULL DEFAULT 'NY',
  zip_code TEXT,
  capacity INTEGER,
  venue_type TEXT CHECK (venue_type IN ('club', 'bar', 'lounge', 'restaurant', 'outdoor')),
  contact_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memberships table
CREATE TABLE memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'promoter', 'bottle_girl', 'team')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  card_identifier TEXT UNIQUE NOT NULL,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upgraded_by UUID REFERENCES users(id),
  upgraded_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id)
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  venue_id UUID REFERENCES venues(id),
  promoter_id UUID REFERENCES users(id),
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL,
  tier_discounts JSONB DEFAULT '{}'::jsonb,
  tier_perks JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  membership_id UUID REFERENCES memberships(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  original_price DECIMAL(10,2) NOT NULL,
  tier_discount_applied DECIMAL(10,2) DEFAULT 0,
  promo_code_id UUID,
  promo_discount_applied DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  qr_code TEXT UNIQUE,
  guest_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Perks table
CREATE TABLE perks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  perk_type TEXT NOT NULL CHECK (perk_type IN ('purchasable', 'tier_granted')),
  price DECIMAL(10,2),
  tier_requirement TEXT CHECK (tier_requirement IN ('basic', 'promoter', 'bottle_girl', 'team')),
  available_quantity INTEGER,
  redeemable_at TEXT[],
  valid_until TIMESTAMP WITH TIME ZONE,
  qr_code_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sweepstakes table
CREATE TABLE sweepstakes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prize_description TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  winner_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  entry_method TEXT NOT NULL DEFAULT 'ticket_purchase',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sweepstakes entries table
CREATE TABLE sweepstakes_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sweepstakes_id UUID REFERENCES sweepstakes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id),
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(sweepstakes_id, ticket_id)
);
