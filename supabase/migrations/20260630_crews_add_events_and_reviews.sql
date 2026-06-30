-- Add total_events counter to crews (incremented when a crew outing is logged)
ALTER TABLE public.crews
  ADD COLUMN IF NOT EXISTS total_events integer NOT NULL DEFAULT 0;

-- Reviews left by crew members about outings
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id     uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_crew_id_idx ON public.reviews(crew_id);
