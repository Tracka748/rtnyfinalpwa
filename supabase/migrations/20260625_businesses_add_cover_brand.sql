-- Add branding columns to businesses for the Plan My Day branded stop cards
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS brand_color text;
