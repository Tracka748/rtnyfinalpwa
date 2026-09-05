BEGIN;

-- Canonical vocabulary, source of truth for all vibe-tag references
CREATE TABLE vibe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  category TEXT NOT NULL CHECK (category IN ('energy', 'music', 'social', 'activity', 'community')),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO vibe_tags (slug, label, emoji, category, sort_order, is_active) VALUES
  ('high-energy', 'High Energy', '🔥', 'energy', 1, true),
  ('chill', 'Chill', '🍸', 'energy', 2, true),
  ('something-different', 'Something Different', '🎭', 'energy', 3, true),
  ('hip-hop', 'Hip Hop', '🎧', 'music', 4, true),
  ('reggae-dancehall', 'Reggae & Dancehall', '🎶', 'music', 5, true),
  ('spanish-vibes', 'Spanish Vibes', '💃', 'music', 6, true),
  ('live-music', 'Live Music', '🎸', 'music', 7, true),
  ('with-the-crew', 'With the Crew', '👯', 'social', 8, true),
  ('date-night', 'Date Night', '❤️', 'social', 9, true),
  ('solo-explorer', 'Solo Explorer', '🚶', 'social', 10, true),
  ('dancing', 'Dancing', '💃', 'activity', 11, true),
  ('foodie', 'Foodie', '🍽️', 'activity', 12, true),
  ('lgbtq', 'LGBTQ', '🏳️‍🌈', 'community', 13, true),
  -- V2, seeded inactive for future use
  ('edm-house', 'EDM/House', '🎛️', 'music', 14, false),
  ('family-friendly', 'Family Friendly', '👨‍👩‍👧', 'social', 15, false),
  ('local-music-junkie', 'Local Music Junkie', '🎼', 'music', 16, false),
  ('arts-culture', 'Arts & Culture', '🎨', 'activity', 17, false),
  ('sports-fan', 'Sports Fan', '🏈', 'activity', 18, false);

ALTER TABLE vibe_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vibe tags"
  ON vibe_tags FOR SELECT
  USING (is_active = true);

-- vibe_shares: created only on successful share, powers daily cap + future Vibe Feed/Vibe Demand
CREATE TABLE vibe_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('prompt', 'personalized')),
  vibe_tags TEXT[] NOT NULL CHECK (array_length(vibe_tags, 1) BETWEEN 1 AND 3),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vibe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own vibe shares"
  ON vibe_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own vibe shares"
  ON vibe_shares FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
