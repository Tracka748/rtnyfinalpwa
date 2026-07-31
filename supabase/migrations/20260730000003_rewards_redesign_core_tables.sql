-- Creates new tables for the Credits, Stubs, Vouchers, Cards, Badges, and
-- Points Earning Limits layers of the rewards system. All additive — no
-- existing tables are modified.

-- LAYER: Points — Earning Limits (rate limiting / diminishing returns)
CREATE TABLE IF NOT EXISTS point_earning_limits (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason            point_reason NOT NULL,
  venue_id          UUID,
  count_in_window   INT         NOT NULL DEFAULT 0,
  window_start      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_earned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reason)
);
ALTER TABLE point_earning_limits ENABLE ROW LEVEL SECURITY;

-- LAYER: Credits — Campaign Budgets (internal only, never user-facing)
CREATE TABLE IF NOT EXISTS campaign_budgets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name   TEXT        NOT NULL,
  total_budget    INT         NOT NULL,
  spent_amount    INT         NOT NULL DEFAULT 0,
  per_user_cap    INT         NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campaign_budgets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS campaign_budget_spends (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID        NOT NULL REFERENCES campaign_budgets(id) ON DELETE RESTRICT,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_spent  INT         NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campaign_budget_spends ENABLE ROW LEVEL SECURITY;

-- LAYER: Stubs — Transaction History
CREATE TABLE IF NOT EXISTS stub_transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount              INT         NOT NULL,
  event_id            UUID,
  reason              TEXT        NOT NULL,
  profit_verified_by  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE stub_transactions ENABLE ROW LEVEL SECURITY;

-- LAYER: Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_type      TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired')),
  requirements      JSONB       NOT NULL DEFAULT '{}',
  min_dwell_seconds INT,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS voucher_steps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id    UUID        NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  step_order    INT         NOT NULL,
  description   TEXT        NOT NULL,
  completed     BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ
);
ALTER TABLE voucher_steps ENABLE ROW LEVEL SECURITY;

-- LAYER: Cards
CREATE TABLE IF NOT EXISTS partner_cards (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id     UUID        NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  value          INT         NOT NULL,
  value_ceiling  INT         NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired')),
  throttled      BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE partner_cards ENABLE ROW LEVEL SECURITY;

-- LAYER: Badges
CREATE TABLE IF NOT EXISTS badge_definitions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type        TEXT    NOT NULL UNIQUE,
  label             TEXT    NOT NULL,
  rarity_tier       TEXT    NOT NULL CHECK (rarity_tier IN ('common','uncommon','rare','legendary')),
  requires_systems  JSONB   NOT NULL DEFAULT '[]',
  decay_enabled     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type  TEXT        NOT NULL REFERENCES badge_definitions(badge_type) ON DELETE RESTRICT,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_type)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
