-- Adds new point_reason enum values required by the rewards system redesign.
-- MUST be applied before any migration that uses these values.

ALTER TYPE point_reason ADD VALUE IF NOT EXISTS 'spend_voucher';
ALTER TYPE point_reason ADD VALUE IF NOT EXISTS 'spend_card';
ALTER TYPE point_reason ADD VALUE IF NOT EXISTS 'pitch_interaction';
ALTER TYPE point_reason ADD VALUE IF NOT EXISTS 'stub_earned';
ALTER TYPE point_reason ADD VALUE IF NOT EXISTS 'badge_earned';
