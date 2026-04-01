-- Add session_id column to orders for Stripe checkout session lookup
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS orders_session_id_idx ON public.orders (session_id);
