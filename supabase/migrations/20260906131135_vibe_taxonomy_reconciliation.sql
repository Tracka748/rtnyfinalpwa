BEGIN;

-- Merge spanish-vibes into the new "Latin Vibes" category (same concept, new name)
UPDATE vibe_tags
SET slug = 'latin-vibes', label = 'Latin Vibes', emoji = '🎺', sort_order = 6
WHERE slug = 'spanish-vibes';

-- Activate local-music-junkie (was seeded inactive as a V2 tag; it's actually
-- live-load-bearing in the admin dashboard, so it needs to be active now)
UPDATE vibe_tags
SET is_active = true, sort_order = 16
WHERE slug = 'local-music-junkie';

-- Add the two remaining admin-only genres that have no equivalent yet
INSERT INTO vibe_tags (slug, label, emoji, category, sort_order, is_active) VALUES
  ('r-and-b', 'R&B', '🎤', 'music', 8, true),
  ('afrobeats', 'Afrobeats', '🥁', 'music', 9, true);

-- Renumber the rest of the active set into a clean, coherent sequence
UPDATE vibe_tags SET sort_order = 1 WHERE slug = 'high-energy';
UPDATE vibe_tags SET sort_order = 2 WHERE slug = 'chill';
UPDATE vibe_tags SET sort_order = 3 WHERE slug = 'something-different';
UPDATE vibe_tags SET sort_order = 4 WHERE slug = 'hip-hop';
UPDATE vibe_tags SET sort_order = 5 WHERE slug = 'reggae-dancehall';
-- latin-vibes already set to 6 above
UPDATE vibe_tags SET sort_order = 7 WHERE slug = 'live-music';
-- r-and-b (8), afrobeats (9) already set above
UPDATE vibe_tags SET sort_order = 10 WHERE slug = 'with-the-crew';
UPDATE vibe_tags SET sort_order = 11 WHERE slug = 'date-night';
UPDATE vibe_tags SET sort_order = 12 WHERE slug = 'solo-explorer';
UPDATE vibe_tags SET sort_order = 13 WHERE slug = 'dancing';
UPDATE vibe_tags SET sort_order = 14 WHERE slug = 'foodie';
UPDATE vibe_tags SET sort_order = 15 WHERE slug = 'lgbtq';
-- local-music-junkie already set to 16 above

-- Push remaining deferred V2 tags past the active set
UPDATE vibe_tags SET sort_order = 17 WHERE slug = 'edm-house';
UPDATE vibe_tags SET sort_order = 18 WHERE slug = 'family-friendly';
UPDATE vibe_tags SET sort_order = 19 WHERE slug = 'arts-culture';
UPDATE vibe_tags SET sort_order = 20 WHERE slug = 'sports-fan';

COMMIT;
