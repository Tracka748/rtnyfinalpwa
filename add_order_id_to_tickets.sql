-- Migration: Add order_id column to tickets table
-- Purpose: Link tickets to orders for proper relationship querying
-- Date: 2026-01-13

-- Step 1: Add order_id column (nullable initially to allow existing data)
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS order_id UUID;

-- Step 2: Add foreign key constraint to orders table
ALTER TABLE public.tickets
ADD CONSTRAINT fk_tickets_order_id
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Step 3: Create index for faster joins
CREATE INDEX IF NOT EXISTS idx_tickets_order_id
ON public.tickets(order_id);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN public.tickets.order_id IS 'Foreign key linking ticket to the order it was purchased in';

-- Verification queries (run these after migration):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tickets' AND column_name = 'order_id';
--
-- SELECT * FROM tickets WHERE order_id IS NOT NULL LIMIT 5;
