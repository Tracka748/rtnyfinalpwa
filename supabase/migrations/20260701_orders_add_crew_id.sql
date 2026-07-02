-- Add crew attribution to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_crew_id ON public.orders(crew_id) WHERE crew_id IS NOT NULL;