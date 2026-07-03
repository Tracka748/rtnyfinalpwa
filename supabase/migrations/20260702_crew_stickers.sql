-- Sticker credit tracking on crews
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS sticker_attempts_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_sticker_count integer NOT NULL DEFAULT 0;

-- Generated stickers gallery
CREATE TABLE IF NOT EXISTS public.crew_stickers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id      uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  image_url    text NOT NULL,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_stickers_crew_id ON public.crew_stickers(crew_id);