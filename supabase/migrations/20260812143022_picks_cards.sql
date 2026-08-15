-- ============================================
-- RTNY Picks Cards — migration
-- ============================================

-- 1. picks_cards
CREATE TABLE picks_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type TEXT NOT NULL CHECK (card_type IN ('vs', 'list3')),
  mode TEXT NOT NULL CHECK (mode IN ('survey', 'promo')),
  title TEXT NOT NULL,
  background_image_url TEXT,
  background_color TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. picks_card_options
CREATE TABLE picks_card_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES picks_cards(id) ON DELETE CASCADE,
  option_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  link_url TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT picks_card_options_order_check CHECK (option_order BETWEEN 1 AND 3),
  CONSTRAINT picks_card_options_unique_order UNIQUE (card_id, option_order)
);

-- 3. picks_card_votes
CREATE TABLE picks_card_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES picks_cards(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES picks_card_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT picks_card_votes_one_per_user UNIQUE (card_id, user_id)
);

-- Helpful indexes
CREATE INDEX idx_picks_cards_active_order ON picks_cards (is_active, display_order);
CREATE INDEX idx_picks_card_options_card_id ON picks_card_options (card_id);
CREATE INDEX idx_picks_card_votes_card_id ON picks_card_votes (card_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE picks_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks_card_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks_card_votes ENABLE ROW LEVEL SECURITY;

-- picks_cards / picks_card_options: default-deny.
-- All reads/writes go through admin API routes using createSupabaseAdmin(),
-- same pattern as feed_cards. No public policies needed here.

-- picks_card_votes: this is the one user-facing write, so it needs real policies.
CREATE POLICY "Users can insert their own vote"
  ON picks_card_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own votes"
  ON picks_card_votes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No UPDATE/DELETE policies — votes are final once cast (matches "one vote per user" intent).
-- If you want vote-changing later, that's an additive policy, not a rename.

-- ============================================
-- Storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('picks-card-images', 'picks-card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Admin-only writes to the bucket (uploads go through admin API route + service role,
-- same pattern as feed-card-images). Public read since these render on the homepage.
CREATE POLICY "Public read for picks card images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'picks-card-images');
