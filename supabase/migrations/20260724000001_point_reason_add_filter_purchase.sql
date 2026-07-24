-- Add the 'filter_purchase' point_reason enum value used by camera filter unlocks.
--
-- This MUST be its own migration file, applied before 20260724_camera_filters.sql.
-- Postgres does not allow a new enum label added via ALTER TYPE ... ADD VALUE to be
-- used by statements in the same transaction that added it (the label isn't visible
-- until the transaction commits), and the Supabase CLI runs each migration file in
-- its own transaction. Splitting this into a separate, earlier-sorting file is the
-- correct way to satisfy that constraint here.

ALTER TYPE public.point_reason ADD VALUE IF NOT EXISTS 'filter_purchase';
