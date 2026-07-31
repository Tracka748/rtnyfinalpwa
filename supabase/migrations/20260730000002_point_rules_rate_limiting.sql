-- Extends point_rules with rate-limiting configuration columns.

ALTER TABLE point_rules
  ADD COLUMN IF NOT EXISTS cooldown_seconds INT NOT NULL DEFAULT 86400,
  ADD COLUMN IF NOT EXISTS daily_cap INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS diminishing_return_factor NUMERIC NOT NULL DEFAULT 0.5;
