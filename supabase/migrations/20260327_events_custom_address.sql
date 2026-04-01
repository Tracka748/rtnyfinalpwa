-- Migration: support custom address on events
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add the custom_address column
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS custom_address TEXT;

-- 2. Make venue_id nullable so events can use a custom address instead of a venue
ALTER TABLE public.events
  ALTER COLUMN venue_id DROP NOT NULL;
