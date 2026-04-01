-- Add missing columns to orders table required by the Stripe webhook
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id),
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id),
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS order_number varchar,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS customer_email varchar,
  ADD COLUMN IF NOT EXISTS fees numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_status varchar,
  ADD COLUMN IF NOT EXISTS payment_method varchar,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_event_id_idx ON public.orders (event_id);
CREATE INDEX IF NOT EXISTS orders_session_id_idx ON public.orders (session_id);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders (order_number);
